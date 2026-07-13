import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, DRIVER_INITIAL_BALANCE, TRIP_COMMISSION, BALANCE_BLOCK_THRESHOLD } from '../lib/supabase';
import type { Driver, Trip } from '../lib/supabase';
import { playNotificationSound, DRIVER_QUICK_MESSAGES } from '../lib/notification';
import { Car, MapPin, Navigation, MessageCircle, X, Send, Phone, Power, Star, Wallet, TriangleAlert as AlertTriangle, User, MessageCircle as WhatsApp } from 'lucide-react';

export default function DriverPage() {
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  // Trip states
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeCode, setRechargeCode] = useState('');

  // Quick messages for driver
  const quickMessages = DRIVER_QUICK_MESSAGES;

  // Check for saved driver on mount
  useEffect(() => {
    const savedDriverId = localStorage.getItem('driverId');
    if (savedDriverId) {
      loadDriver(savedDriverId);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to trips if driver is online
  useEffect(() => {
    if (!driver || !driver.is_online || driver.is_blocked) return;

    const channel = supabase
      .channel('pending-trips')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trips',
          filter: 'status=eq.pending',
        },
        (payload) => {
          const newTrip = payload.new as Trip;
          setPendingTrips((prev) => [...prev, newTrip]);
          playNotificationSound();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: 'status=eq.cancelled',
        },
        (payload) => {
          const cancelledTrip = payload.new as Trip;
          setPendingTrips((prev) => prev.filter((t) => t.id !== cancelledTrip.id));
          if (currentTrip?.id === cancelledTrip.id) {
            setCurrentTrip(null);
          }
        }
      )
      .subscribe();

    fetchPendingTrips();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.is_online, driver?.is_blocked]);

  // Subscribe to current trip updates
  useEffect(() => {
    if (!currentTrip) return;

    const channel = supabase
      .channel(`trip-${currentTrip.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${currentTrip.id}`,
        },
        (payload) => {
          setCurrentTrip(payload.new as Trip);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTrip?.id]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!currentTrip || !showChat) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${currentTrip.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `trip_id=eq.${currentTrip.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as any]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTrip?.id, showChat]);

  // Check if driver should be blocked
  useEffect(() => {
    if (driver && driver.balance <= BALANCE_BLOCK_THRESHOLD) {
      setIsBlocked(true);
    } else {
      setIsBlocked(false);
    }
  }, [driver?.balance]);

  const loadDriver = async (driverId: string) => {
    const { data } = await supabase.from('drivers').select('*').eq('id', driverId).single();
    if (data) {
      setDriver(data);
      setIsRegistered(data.status === 'approved');
      if (data.status === 'approved') {
        localStorage.setItem('driverId', driverId);
      }
    }
    setIsLoading(false);
  };

  const fetchPendingTrips = async () => {
    const { data } = await supabase.from('trips').select('*').eq('status', 'pending').order('created_at', { ascending: true });
    if (data) setPendingTrips(data);
  };

  const handleRegister = async () => {
    if (!phone || !name || !carModel || !carPlate) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from('drivers')
      .insert({
        phone,
        name,
        car_model: carModel,
        car_plate: carPlate,
        balance: DRIVER_INITIAL_BALANCE,
        status: 'pending',
        is_online: false,
        is_blocked: false,
      })
      .select()
      .single();

    if (error) {
      alert('حدث خطأ، يرجى المحاولة مرة أخرى');
    } else {
      setDriver(data);
      alert('تم إرسال طلبك، يرجى انتظار موافقة الإدارة');
    }

    setIsLoading(false);
  };

  const toggleOnline = async () => {
    if (!driver) return;

    const newStatus = !driver.is_online;
    await supabase.from('drivers').update({ is_online: newStatus }).eq('id', driver.id);

    setDriver({ ...driver, is_online: newStatus });
  };

  const acceptTrip = async (trip: Trip) => {
    if (!driver) return;

    if (isBlocked) {
      alert('⛔ رصيدك نفد! لا يمكنك استقبال رحلات جديدة. يرجى تعبئة رصيدك للمتابعة');
      setShowRechargeModal(true);
      return;
    }

    const { error } = await supabase
      .from('trips')
      .update({
        status: 'accepted',
        driver_id: driver.id,
        driver_name: driver.name,
      })
      .eq('id', trip.id);

    if (!error) {
      setCurrentTrip({ ...trip, status: 'accepted', driver_id: driver.id, driver_name: driver.name });
      setPendingTrips((prev) => prev.filter((t) => t.id !== trip.id));
    }
  };

  const updateTripStatus = async (status: 'arrived' | 'completed' | 'cancelled') => {
    if (!currentTrip || !driver) return;

    const updates: any = { status };

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.updated_at = new Date().toISOString();

      const { data: updatedDriver } = await supabase
        .from('drivers')
        .update({
          balance: driver.balance - TRIP_COMMISSION,
          total_trips: driver.total_trips + 1,
        })
        .eq('id', driver.id)
        .select()
        .single();

      if (updatedDriver) {
        setDriver(updatedDriver);
        if (updatedDriver.balance <= BALANCE_BLOCK_THRESHOLD) {
          await supabase.from('drivers').update({ is_blocked: true }).eq('id', driver.id);
        }
      }
    }

    await supabase.from('trips').update(updates).eq('id', currentTrip.id);

    if (status === 'completed' || status === 'cancelled') {
      setCurrentTrip(null);
      fetchPendingTrips();
    } else {
      setCurrentTrip({ ...currentTrip, ...updates });
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || newMessage;
    if (!text.trim() || !currentTrip) return;

    await supabase.from('chat_messages').insert({
      trip_id: currentTrip.id,
      sender_type: 'driver',
      sender_id: driver?.id,
      message: text,
    });

    setNewMessage('');
  };

  const requestRecharge = async () => {
    if (!rechargeCode || !driver) return;

    const amount = 10000;

    await supabase.from('recharge_requests').insert({
      driver_id: driver.id,
      driver_name: driver.name,
      driver_phone: driver.phone,
      amount,
      recharge_code: rechargeCode,
      status: 'pending',
    });

    alert('تم إرسال طلب التعبئة، يرجى انتظار موافقة الإدارة');
    setShowRechargeModal(false);
    setRechargeCode('');
  };

  // Format phone for WhatsApp
  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove any non-numeric characters and add Iraq country code if needed
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
      formatted = '964' + formatted.substring(1);
    } else if (!formatted.startsWith('964')) {
      formatted = '964' + formatted;
    }
    return formatted;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D4A843] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Registration Screen
  if (!isRegistered && !driver) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="container py-4 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600">
              <Car className="w-6 h-6 text-[#D4A843]" />
              <span className="font-bold">تاكسي</span>
            </button>
          </div>
        </header>

        <main className="container py-6">
          <div className="max-w-md mx-auto card">
            <h2 className="text-xl font-bold mb-6 text-center">تسجيل سائق جديد</h2>

            <div className="space-y-4">
              <div>
                <label className="label">رقم الهاتف</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="07xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="label">الاسم الكامل</label>
                <input
                  type="text"
                  className="input"
                  placeholder="أدخل اسمك"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">نوع السيارة</label>
                <input
                  type="text"
                  className="input"
                  placeholder="مثال: تويوتا كورولا"
                  value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                />
              </div>

              <div>
                <label className="label">رقم اللوحة</label>
                <input
                  type="text"
                  className="input"
                  placeholder="مثال: 12345 - بغداد"
                  value={carPlate}
                  onChange={(e) => setCarPlate(e.target.value)}
                />
              </div>

              <button onClick={handleRegister} className="btn btn-primary w-full py-3" disabled={isLoading}>
                {isLoading ? 'جاري الإرسال...' : 'تسجيل'}
              </button>

              <p className="text-center text-sm text-gray-500">
                عند الموافقة، ستمنح رصيد ترحيبي قدره 5,000 د.ع
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Pending approval
  if (driver && driver.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">بانتظار الموافقة</h2>
          <p className="text-gray-500">طلبك قيد المراجعة، يرجى الانتظار...</p>
        </div>
      </div>
    );
  }

  // Blocked driver screen
  if (driver && isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-red-600">⛔ رصيدك نفد!</h2>
          <p className="text-gray-600 mb-6">لا يمكنك استقبال رحلات جديدة. يرجى تعبئة رصيدك للمتابعة</p>
          <button onClick={() => setShowRechargeModal(true)} className="btn btn-primary w-full px-6 py-3">
            تعبئة الرصيد 💳
          </button>

          {showRechargeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRechargeModal(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">طلب تعبئة الرصيد</h3>
                <div className="mb-4">
                  <label className="label">رمز بطاقة التعبئة</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="أدخل رمز البطاقة"
                    value={rechargeCode}
                    onChange={(e) => setRechargeCode(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowRechargeModal(false)} className="btn btn-secondary flex-1">
                    إلغاء
                  </button>
                  <button onClick={requestRecharge} className="btn btn-primary flex-1">
                    إرسال الطلب
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main driver dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Car className="w-6 h-6 text-[#D4A843]" />
              <div>
                <h1 className="font-bold">{driver?.name}</h1>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {driver?.rating.toFixed(1)} ({driver?.total_trips} رحلة)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRechargeModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100"
              >
                <Wallet className="w-5 h-5 text-gray-600" />
                <span className={`font-bold ${driver && driver.balance < 0 ? 'text-red-500' : ''}`}>
                  {driver?.balance.toLocaleString()} د.ع
                </span>
              </button>

              <button
                onClick={toggleOnline}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  driver?.is_online ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                <Power className="w-5 h-5" />
                {driver?.is_online ? 'متاح' : 'غير متاح'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4">
        {/* Current Trip - FIX 2: Show passenger info with call/WhatsApp */}
        {currentTrip && (
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">الرحلة الحالية</h2>
              <span className={`badge badge-${currentTrip.status}`}>{
                currentTrip.status === 'accepted' ? 'مقبولة' :
                currentTrip.status === 'arrived' ? 'وصلت' :
                currentTrip.status === 'completed' ? 'مكتملة' : 'ملغاة'
              }</span>
            </div>

            {/* FIX 2: Passenger Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-[#D4A843]/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-[#D4A843]" />
                </div>
                <div>
                  <p className="font-bold">{currentTrip.passenger_name || 'الراكب'}</p>
                  <p className="text-gray-500 text-sm">{currentTrip.passenger_phone}</p>
                </div>
              </div>

              {/* FIX 2: Call and WhatsApp buttons */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`tel:${currentTrip.passenger_phone}`}
                  className="btn btn-primary py-3"
                >
                  <Phone className="w-5 h-5 ml-2" />
                  اتصل بالراكب 📞
                </a>
                <a
                  href={`https://wa.me/${formatPhoneForWhatsApp(currentTrip.passenger_phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp py-3"
                >
                  <WhatsApp className="w-5 h-5 ml-2" />
                  واتساب الراكب 💬
                </a>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>{currentTrip.pickup_address}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Navigation className="w-5 h-5 text-gray-400" />
                <span>{currentTrip.dropoff_address}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#D4A843]/10 rounded-lg mb-4">
              <span>الأجرة</span>
              <span className="font-bold text-[#D4A843]">{currentTrip.fare?.toLocaleString()} د.ع</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {currentTrip.status === 'accepted' && (
                <button onClick={() => updateTripStatus('arrived')} className="btn btn-primary py-3">
                  وصلت 📍
                </button>
              )}
              {currentTrip.status === 'arrived' && (
                <button onClick={() => updateTripStatus('completed')} className="btn btn-success py-3">
                  إكمال الرحلة ✓
                </button>
              )}
              <button onClick={() => updateTripStatus('cancelled')} className="btn btn-danger py-3">
                إلغاء
              </button>
              <button onClick={() => setShowChat(true)} className="btn btn-outline py-3">
                <MessageCircle className="w-5 h-5 ml-2" />
                محادثة
              </button>
            </div>
          </div>
        )}

        {/* Pending Trips - FIX 2: Show full passenger info */}
        {driver?.is_online && !currentTrip && (
          <div>
            <h2 className="font-bold mb-3">الرحلات المتاحة ({pendingTrips.length})</h2>
            {pendingTrips.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد رحلات متاحة حالياً</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTrips.map((trip) => (
                  <div key={trip.id} className="card animate-slide-in">
                    {/* FIX 2: Passenger name */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#D4A843]/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-[#D4A843]" />
                      </div>
                      <div>
                        <p className="font-medium">{trip.passenger_name || 'راكب'}</p>
                        <p className="text-sm text-gray-500">{trip.passenger_phone}</p>
                      </div>
                      <span className={`badge ${trip.taxi_type === 'super' ? 'badge-warning' : 'badge-pending'} mr-auto`}>
                        {trip.taxi_type === 'super' ? 'سوبر' : 'عادي'}
                      </span>
                    </div>

                    {/* FIX 2: Location info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">من: {trip.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Navigation className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">إلى: {trip.dropoff_address}</span>
                      </div>
                    </div>

                    {/* FIX 2: Distance and fare */}
                    <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">المسافة</p>
                        <p className="font-bold">{trip.distance_km?.toFixed(1)} كم</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">الأجرة</p>
                        <p className="font-bold text-[#D4A843]">{trip.fare?.toLocaleString()} د.ع</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">النوع</p>
                        <p className="font-bold">{trip.taxi_type === 'super' ? 'سوبر' : 'عادي'}</p>
                      </div>
                    </div>

                    <button onClick={() => acceptTrip(trip)} className="btn btn-primary w-full">
                      قبول الرحلة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Offline State */}
        {driver && !driver.is_online && !currentTrip && (
          <div className="text-center py-12">
            <Power className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">أنت غير متاح الآن</p>
            <button onClick={toggleOnline} className="btn btn-primary mt-4">
              تفعيل لاستقبال الرحلات
            </button>
          </div>
        )}
      </main>

      {/* Chat Modal */}
      {showChat && currentTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50" onClick={() => setShowChat(false)}>
          <div className="bg-white rounded-t-xl md:rounded-xl w-full max-w-md h-[70vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">محادثة مع {currentTrip.passenger_name || 'الراكب'}</h3>
              <button onClick={() => setShowChat(false)} className="text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Messages */}
            <div className="flex gap-2 overflow-x-auto p-2 border-b">
              {quickMessages.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(msg)}
                  className="shrink-0 px-3 py-1.5 text-sm border border-[#D4A843] text-[#D4A843] rounded-full hover:bg-[#D4A843] hover:text-white transition-colors whitespace-nowrap"
                >
                  {msg}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 py-8">ابدأ المحادثة...</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'driver' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.sender_type === 'driver'
                          ? 'bg-[#D4A843] text-white'
                          : 'bg-white border'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="اكتب رسالتك..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={() => sendMessage()} className="btn btn-primary px-4">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRechargeModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">طلب تعبئة الرصيد</h3>
            <p className="text-gray-500 text-sm mb-4">الرصيد الحالي: {driver?.balance.toLocaleString()} د.ع</p>

            <div className="mb-4">
              <label className="label">رمز بطاقة التعبئة</label>
              <input
                type="text"
                className="input"
                placeholder="أدخل رمز البطاقة"
                value={rechargeCode}
                onChange={(e) => setRechargeCode(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRechargeModal(false)} className="btn btn-secondary flex-1">
                إلغاء
              </button>
              <button onClick={requestRecharge} className="btn btn-primary flex-1">
                إرسال الطلب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
