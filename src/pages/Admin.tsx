import { useState, useEffect } from 'react';
import { supabase, TRIP_COMMISSION } from '../lib/supabase';
import type { Driver, Trip, RechargeRequest } from '../lib/supabase';
import { Car, Users, TrendingUp, Wallet, Bell, Check, X, Search, LogOut, ChartBar as BarChart3 } from 'lucide-react';

type TabType = 'overview' | 'drivers' | 'trips' | 'recharge' | 'revenue';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Data states
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);

  // Filter states
  const [driverFilter, setDriverFilter] = useState<'all' | 'pending' | 'approved' | 'online'>('all');
  const [tripFilter, setTripFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'cancelled'>('all');
  const [rechargeFilter, setRechargeFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Statistics
  const [stats, setStats] = useState({
    totalTrips: 0,
    activeTrips: 0,
    totalDrivers: 0,
    onlineDrivers: 0,
    totalRevenue: 0,
    pendingRecharges: 0,
  });

  // Check for saved auth
  useEffect(() => {
    const savedAuth = localStorage.getItem('adminAuth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch all data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchData();

    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recharge_requests' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const fetchData = async () => {
    const { data: driversData } = await supabase.from('drivers').select('*').order('created_at', { ascending: false });
    if (driversData) setDrivers(driversData);

    const { data: tripsData } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    if (tripsData) setTrips(tripsData);

    const { data: rechargeData } = await supabase.from('recharge_requests').select('*').order('created_at', { ascending: false });
    if (rechargeData) setRechargeRequests(rechargeData);

    const completedTrips = tripsData?.filter((t) => t.status === 'completed') || [];
    const activeTrips = tripsData?.filter((t) => ['pending', 'accepted', 'arrived'].includes(t.status)) || [];
    const onlineDrivers = driversData?.filter((d) => d.is_online && d.status === 'approved') || [];
    const pendingRecharges = rechargeData?.filter((r) => r.status === 'pending') || [];
    const totalRevenue = completedTrips.length * TRIP_COMMISSION;

    setStats({
      totalTrips: tripsData?.length || 0,
      activeTrips: activeTrips.length,
      totalDrivers: driversData?.filter((d) => d.status === 'approved').length || 0,
      onlineDrivers: onlineDrivers.length,
      totalRevenue,
      pendingRecharges: pendingRecharges.length,
    });
  };

  const handleLogin = () => {
    if (password === 'admin2024') {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuth', 'true');
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuth');
  };

  const approveDriver = async (driverId: string) => {
    await supabase.from('drivers').update({ status: 'approved', balance: 5000 }).eq('id', driverId);
    fetchData();
  };

  const deleteDriver = async (driverId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السائق؟')) {
      await supabase.from('drivers').delete().eq('id', driverId);
      fetchData();
    }
  };

  const approveRecharge = async (requestId: string, driverId: string, amount: number) => {
    await supabase.from('recharge_requests').update({ status: 'approved' }).eq('id', requestId);

    const driver = drivers.find((d) => d.id === driverId);
    if (driver) {
      const newBalance = driver.balance + amount;
      await supabase.from('drivers').update({ balance: newBalance, is_blocked: newBalance > -5000 ? false : driver.is_blocked }).eq('id', driverId);
    }

    fetchData();
  };

  const rejectRecharge = async (requestId: string) => {
    await supabase.from('recharge_requests').update({ status: 'rejected' }).eq('id', requestId);
    fetchData();
  };

  const filteredDrivers = drivers.filter((driver) => {
    if (driverFilter === 'pending') return driver.status === 'pending';
    if (driverFilter === 'approved') return driver.status === 'approved';
    if (driverFilter === 'online') return driver.is_online && driver.status === 'approved';
    return true;
  }).filter((driver) => searchQuery ? driver.name.includes(searchQuery) || driver.phone.includes(searchQuery) : true);

  const filteredTrips = trips.filter((trip) => tripFilter === 'all' || trip.status === tripFilter);
  const filteredRecharges = rechargeRequests.filter((req) => rechargeFilter === 'all' || req.status === rechargeFilter);

  const completedTrips = trips.filter((t) => t.status === 'completed');
  const last7DaysRevenue = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStr = date.toISOString().split('T')[0];
    const dayTrips = completedTrips.filter((t) => t.completed_at?.startsWith(dayStr));
    return { date: date.toLocaleDateString('ar-IQ', { weekday: 'short' }), revenue: dayTrips.length * TRIP_COMMISSION, trips: dayTrips.length };
  }).reverse();

  const normalTrips = completedTrips.filter((t) => t.taxi_type === 'normal');
  const superTrips = completedTrips.filter((t) => t.taxi_type === 'super');

  const topDrivers = Object.entries(completedTrips.reduce((acc, trip) => {
    if (trip.driver_name) acc[trip.driver_name] = (acc[trip.driver_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card max-w-sm w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-[#D4A843]" />
            </div>
            <h1 className="text-xl font-bold">لوحة تحكم الإدارة</h1>
            <p className="text-gray-500 text-sm">أدخل كلمة المرور للدخول</p>
          </div>
          <div className="space-y-4">
            <input type="password" className="input text-center" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
            <button onClick={handleLogin} className="btn btn-primary w-full py-3">دخول</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 text-[#D4A843]" />
            <h1 className="font-bold">لوحة تحكم الإدارة</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-500">
            <LogOut className="w-5 h-5" />
            خروج
          </button>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="container overflow-x-auto">
          <div className="flex gap-1 py-2">
            {[
              { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
              { id: 'drivers', label: 'السائقون', icon: Users },
              { id: 'trips', label: 'الرحلات', icon: Car },
              { id: 'recharge', label: 'طلبات التعبئة', icon: Wallet },
              { id: 'revenue', label: 'الإيرادات', icon: TrendingUp },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-[#D4A843] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container py-6">
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="card">
              <div className="flex items-center gap-3 mb-2"><Car className="w-8 h-8 text-[#D4A843]" /><span className="text-gray-500">إجمالي الرحلات</span></div>
              <p className="text-2xl font-bold">{stats.totalTrips}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><Car className="w-4 h-4 text-blue-500" /></div><span className="text-gray-500">الرحلات النشطة</span></div>
              <p className="text-2xl font-bold text-blue-500">{stats.activeTrips}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2"><Users className="w-8 h-8 text-green-500" /><span className="text-gray-500">إجمالي السائقين</span></div>
              <p className="text-2xl font-bold">{stats.totalDrivers}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><Users className="w-4 h-4 text-green-500" /></div><span className="text-gray-500">السائقون المتاحون</span></div>
              <p className="text-2xl font-bold text-green-500">{stats.onlineDrivers}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2"><TrendingUp className="w-8 h-8 text-[#D4A843]" /><span className="text-gray-500">إجمالي العمولات</span></div>
              <p className="text-2xl font-bold text-[#D4A843]">{stats.totalRevenue.toLocaleString()} د.ع</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2"><Bell className="w-8 h-8 text-orange-500" /><span className="text-gray-500">طلبات التعبئة المعلقة</span></div>
              <p className="text-2xl font-bold text-orange-500">{stats.pendingRecharges}</p>
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" className="input pr-10" placeholder="بحث بالاسم أو الهاتف..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex gap-2">
                {['all', 'pending', 'approved', 'online'].map((filter) => (
                  <button key={filter} onClick={() => setDriverFilter(filter as any)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${driverFilter === filter ? 'bg-[#D4A843] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                    {filter === 'all' ? 'الكل' : filter === 'pending' ? 'معلق' : filter === 'approved' ? 'مفعل' : 'متاح'}
                  </button>
                ))}
              </div>
            </div>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-3 text-gray-600 font-medium">الاسم</th>
                      <th className="text-right p-3 text-gray-600 font-medium">الهاتف</th>
                      <th className="text-right p-3 text-gray-600 font-medium">السيارة</th>
                      <th className="text-center p-3 text-gray-600 font-medium">التقييم</th>
                      <th className="text-center p-3 text-gray-600 font-medium">الرحلات</th>
                      <th className="text-center p-3 text-gray-600 font-medium">الرصيد</th>
                      <th className="text-center p-3 text-gray-600 font-medium">الحالة</th>
                      <th className="text-center p-3 text-gray-600 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{driver.name}</td>
                        <td className="p-3 text-gray-600">{driver.phone}</td>
                        <td className="p-3 text-gray-600">{driver.car_model}</td>
                        <td className="p-3 text-center">{driver.rating.toFixed(1)}</td>
                        <td className="p-3 text-center">{driver.total_trips}</td>
                        <td className="p-3 text-center"><span className={driver.balance <= -5000 ? 'text-red-500 font-bold' : ''}>{driver.balance.toLocaleString()}</span></td>
                        <td className="p-3 text-center"><span className={`badge badge-${driver.status === 'approved' ? 'completed' : driver.status === 'pending' ? 'pending' : 'cancelled'}`}>{driver.status === 'approved' ? 'مفعل' : driver.status === 'pending' ? 'معلق' : 'مرفوض'}</span></td>
                        <td className="p-3">
                          <div className="flex justify-center gap-2">
                            {driver.status === 'pending' && (
                              <>
                                <button onClick={() => approveDriver(driver.id)} className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"><Check className="w-4 h-4" /></button>
                                <button onClick={() => deleteDriver(driver.id)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"><X className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trips' && (
          <div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {['all', 'pending', 'accepted', 'completed', 'cancelled'].map((filter) => (
                <button key={filter} onClick={() => setTripFilter(filter as any)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${tripFilter === filter ? 'bg-[#D4A843] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                  {filter === 'all' ? 'الكل' : filter === 'pending' ? 'معلقة' : filter === 'accepted' ? 'مقبولة' : filter === 'completed' ? 'مكتملة' : 'ملغاة'}
                </button>
              ))}
            </div>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-3 text-gray-600 font-medium">التاريخ</th>
                      <th className="text-right p-3 text-gray-600 font-medium">الراكب</th>
                      <th className="text-right p-3 text-gray-600 font-medium">السائق</th>
                      <th className="text-right p-3 text-gray-600 font-medium">من</th>
                      <th className="text-right p-3 text-gray-600 font-medium">إلى</th>
                      <th className="text-center p-3 text-gray-600 font-medium">الأجرة</th>
                      <th className="text-center p-3 text-gray-600 font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrips.map((trip) => (
                      <tr key={trip.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 text-gray-600">{new Date(trip.created_at).toLocaleDateString('ar-IQ')}</td>
                        <td className="p-3">{trip.passenger_name || trip.passenger_phone}</td>
                        <td className="p-3">{trip.driver_name || '-'}</td>
                        <td className="p-3 text-gray-600 max-w-[150px] truncate">{trip.pickup_address}</td>
                        <td className="p-3 text-gray-600 max-w-[150px] truncate">{trip.dropoff_address}</td>
                        <td className="p-3 text-center font-medium">{trip.fare?.toLocaleString()} د.ع</td>
                        <td className="p-3 text-center"><span className={`badge badge-${trip.status}`}>{trip.status === 'pending' ? 'معلقة' : trip.status === 'accepted' ? 'مقبولة' : trip.status === 'completed' ? 'مكتملة' : 'ملغاة'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recharge' && (
          <div>
            <div className="flex gap-2 mb-4">
              {['all', 'pending', 'approved', 'rejected'].map((filter) => (
                <button key={filter} onClick={() => setRechargeFilter(filter as any)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${rechargeFilter === filter ? 'bg-[#D4A843] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                  {filter === 'all' ? 'الكل' : filter === 'pending' ? 'معلق' : filter === 'approved' ? 'موافق' : 'مرفوض'}
                </button>
              ))}
            </div>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-3 text-gray-600 font-medium">السائق</th>
                      <th className="text-center p-3 text-gray-600 font-medium">المبلغ</th>
                      <th className="text-center p-3 text-gray-600 font-medium">الرمز</th>
                      <th className="text-center p-3 text-gray-600 font-medium">الحالة</th>
                      <th className="text-center p-3 text-gray-600 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecharges.map((req) => (
                      <tr key={req.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{req.driver_name}</td>
                        <td className="p-3 text-center">{req.amount.toLocaleString()} د.ع</td>
                        <td className="p-3 text-center font-mono">{req.recharge_code}</td>
                        <td className="p-3 text-center"><span className={`badge badge-${req.status}`}>{req.status === 'pending' ? 'معلق' : req.status === 'approved' ? 'موافق' : 'مرفوض'}</span></td>
                        <td className="p-3">
                          <div className="flex justify-center gap-2">
                            {req.status === 'pending' && (
                              <>
                                <button onClick={() => approveRecharge(req.id, req.driver_id, req.amount)} className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"><Check className="w-4 h-4" /></button>
                                <button onClick={() => rejectRecharge(req.id)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"><X className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="card bg-gradient-to-br from-[#D4A843] to-[#B8923A] text-white">
                <h3 className="text-lg mb-2 opacity-90">إجمالي العمولات</h3>
                <p className="text-3xl font-bold">{stats.totalRevenue.toLocaleString()} د.ع</p>
                <p className="text-sm mt-2 opacity-75">{completedTrips.length} رحلة مكتملة</p>
              </div>
              <div className="card">
                <h3 className="text-gray-500 mb-2">رحلات عادية</h3>
                <p className="text-2xl font-bold">{normalTrips.length}</p>
                <p className="text-sm text-gray-500">{normalTrips.length * TRIP_COMMISSION} د.ع عمولة</p>
              </div>
              <div className="card">
                <h3 className="text-gray-500 mb-2">رحلات سوبر</h3>
                <p className="text-2xl font-bold">{superTrips.length}</p>
                <p className="text-sm text-gray-500">{superTrips.length * TRIP_COMMISSION} د.ع عمولة</p>
              </div>
            </div>
            <div className="card mb-6">
              <h3 className="font-bold mb-4">الإيرادات آخر 7 أيام</h3>
              <div className="space-y-3">
                {last7DaysRevenue.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="w-16 text-gray-600">{day.date}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="h-full bg-[#D4A843] rounded-full flex items-center justify-end px-2" style={{ width: `${(day.revenue / Math.max(...last7DaysRevenue.map(d => d.revenue), 1)) * 100}%` }}>
                        <span className="text-xs text-white font-medium">{day.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-gray-500 text-sm">{day.trips} رحلة</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 className="font-bold mb-4">أفضل 5 سائقين</h3>
              <div className="space-y-3">
                {topDrivers.length > 0 ? topDrivers.map(([name, count], idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <span className="w-8 h-8 rounded-full bg-[#D4A843]/10 flex items-center justify-center text-[#D4A843] font-bold">{idx + 1}</span>
                    <span className="flex-1 font-medium">{name}</span>
                    <span className="text-gray-500">{count} رحلة</span>
                    <span className="text-[#D4A843] font-bold">{(count * TRIP_COMMISSION).toLocaleString()} د.ع</span>
                  </div>
                )) : <div className="text-center py-4 text-gray-500">لا توجد رحلات مكتملة بعد</div>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
