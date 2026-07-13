import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Trip, Passenger } from '../lib/supabase';
import { playNotificationSound } from '../lib/notification';
import { MapPin, Navigation, Car, MessageCircle, X, Send, Phone, ArrowRight, User } from 'lucide-react';

export default function Passenger() {
  const [loginStep, setLoginStep] = useState<'phone' | 'name' | 'main'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [step, setStep] = useState<'request' | 'waiting' | 'matched' | 'chat'>('request');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [taxiType, setTaxiType] = useState<'normal' | 'super'>('normal');
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick messages for passenger
  const quickMessages = [
    "حسناً، في انتظارك ✅",
    "أنا أمام المبنى 🏢",
    "كم دقيقة تبقى؟ ⏱️",
    "شكراً 🙏",
    "أنا جاهز 👍",
  ];

  // Check for saved passenger on mount
  useEffect(() => {
    const savedPassenger = localStorage.getItem('passenger');
    if (savedPassenger) {
      const p = JSON.parse(savedPassenger);
      setPassenger(p);
      setPhone(p.phone);
      setName(p.name || '');
      setLoginStep('main');
    }
  }, []);

  // Get current location
  useEffect(() => {
    if (loginStep !== 'main') return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPickupCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setPickup('موقعي الحالي');
        },
        () => {
          setPickupCoords({ lat: 33.3152, lng: 44.3661 });
          setPickup('بغداد');
        }
      );
    }
  }, [loginStep]);

  // Subscribe to trip updates
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
          const updatedTrip = payload.new as Trip;
          setCurrentTrip(updatedTrip);

          if (updatedTrip.status === 'accepted') {
            playNotificationSound();
            showNotification('✅ تم قبول طلبك، السائق في الطريق إليك', 'success');
            setStep('matched');
          } else if (updatedTrip.status === 'arrived') {
            playNotificationSound();
            showNotification('🚕 وصل السائق إلى موقعك', 'info');
          } else if (updatedTrip.status === 'cancelled') {
            playNotificationSound();
            showNotification('❌ قام السائق بإلغاء الرحلة', 'error');
          } else if (updatedTrip.status === 'completed') {
            showNotification('✅ تم إكمال الرحلة بنجاح', 'success');
            setTimeout(() => {
              setStep('request');
              setCurrentTrip(null);
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTrip?.id]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!currentTrip || step !== 'chat') return;

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
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTrip?.id, step]);

  const showNotification = (message: string, type: string) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // FIX 1: Handle phone input
  const handlePhoneSubmit = async () => {
    if (!phone || phone.length < 10) {
      showNotification('يرجى إدخال رقم هاتف صحيح', 'error');
      return;
    }

    setLoading(true);
    const { data: existingPassenger } = await supabase
      .from('passengers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (existingPassenger) {
      // Existing passenger - login directly
      setPassenger(existingPassenger);
      localStorage.setItem('passenger', JSON.stringify(existingPassenger));
      setLoginStep('main');
    } else {
      // New passenger - show name input
      setLoginStep('name');
    }
    setLoading(false);
  };

  // FIX 1: Handle name input and complete registration
  const handleNameSubmit = async () => {
    if (!name || name.length < 2) {
      showNotification('يرجى إدخال اسمك', 'error');
      return;
    }

    setLoading(true);
    const { data: newPassenger, error } = await supabase
      .from('passengers')
      .insert({ phone, name })
      .select()
      .single();

    if (error || !newPassenger) {
      showNotification('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    } else {
      setPassenger(newPassenger);
      localStorage.setItem('passenger', JSON.stringify(newPassenger));
      setLoginStep('main');
    }
    setLoading(false);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleRequestTrip = async () => {
    if (!pickup || !dropoff || !pickupCoords || !dropoffCoords || !passenger) {
      showNotification('يرجى ملء جميع الحقول', 'error');
      return;
    }

    setLoading(true);

    const distance = calculateDistance(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
    const baseFare = 2000;
    const perKm = 500;
    const fare = Math.round(baseFare + distance * perKm * (taxiType === 'super' ? 1.5 : 1));

    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        passenger_id: passenger.id,
        passenger_phone: phone,
        passenger_name: passenger.name,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        pickup_address: pickup,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        dropoff_address: dropoff,
        distance_km: distance,
        fare,
        taxi_type: taxiType,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      showNotification('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    } else {
      setCurrentTrip(trip);
      setStep('waiting');
      showNotification('تم إرسال طلبك، جاري البحث عن سائق...', 'info');
    }

    setLoading(false);
  };

  const handleSetDropoff = () => {
    if (pickupCoords) {
      setDropoffCoords({
        lat: pickupCoords.lat + 0.01,
        lng: pickupCoords.lng + 0.01,
      });
      setDropoff('الوجهة المحددة');
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || newMessage;
    if (!text.trim() || !currentTrip) return;

    await supabase.from('chat_messages').insert({
      trip_id: currentTrip.id,
      sender_type: 'passenger',
      message: text,
    });

    setNewMessage('');
  };

  const requestNewTrip = () => {
    setStep('request');
    setCurrentTrip(null);
    setNotification(null);
  };

  const logout = () => {
    localStorage.removeItem('passenger');
    setPassenger(null);
    setLoginStep('phone');
    setPhone('');
    setName('');
  };

  // Login Screen - Phone Step
  if (loginStep === 'phone') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div className="card bg-white max-w-sm w-full mx-4 animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-[#D4A843]" />
            </div>
            <h1 className="text-xl font-bold">مرحباً بك</h1>
            <p className="text-gray-500 text-sm">أدخل رقم هاتفك للمتابعة</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">رقم الهاتف</label>
              <input
                type="tel"
                className="input text-center text-lg"
                placeholder="07xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePhoneSubmit()}
              />
            </div>

            <button onClick={handlePhoneSubmit} className="btn btn-primary w-full py-3" disabled={loading}>
              {loading ? 'جاري التحقق...' : 'متابعة'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login Screen - Name Step (FIX 1)
  if (loginStep === 'name') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div className="card bg-white max-w-sm w-full mx-4 animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-[#D4A843]" />
            </div>
            <h1 className="text-xl font-bold">ما اسمك؟</h1>
            <p className="text-gray-500 text-sm">سنستخدمه لتعريف السائقين بكِ</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">الاسم</label>
              <input
                type="text"
                className="input text-center text-lg"
                placeholder="أدخل اسمك"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
            </div>

            <button onClick={handleNameSubmit} className="btn btn-primary w-full py-3" disabled={loading}>
              {loading ? 'جاري التسجيل...' : 'ابدأ الآن'}
            </button>

            <button onClick={() => setLoginStep('phone')} className="btn btn-secondary w-full py-2">
              <ArrowRight className="w-4 h-4 ml-2" />
              رجوع
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Passenger Interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 text-[#D4A843]" />
            <div>
              <span className="font-bold">تاكسي</span>
              <p className="text-xs text-gray-500">مرحباً، {passenger?.name}</p>
            </div>
          </div>
          <button onClick={logout} className="text-gray-500 text-sm hover:text-red-500">
            خروج
          </button>
        </div>
      </header>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`fixed top-16 left-4 right-4 z-50 p-4 rounded-lg shadow-lg animate-fade-in ${
            notification.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : notification.type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium text-sm">{notification.message}</p>
            {notification.type === 'error' && (
              <button onClick={requestNewTrip} className="btn btn-primary text-sm py-1 px-2 whitespace-nowrap">
                طلب رحلة جديدة
              </button>
            )}
            <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container py-6">
        {step === 'request' && (
          <div className="max-w-md mx-auto">
            <div className="card">
              <h2 className="text-xl font-bold mb-6 text-center">طلب رحلة جديدة</h2>

              <div className="space-y-4">
                <div>
                  <label className="label">موقع الانطلاق</label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="input pr-10"
                      placeholder="اختر موقع الانطلاق"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">الوجهة</label>
                  <div className="relative">
                    <Navigation className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="input pr-10"
                      placeholder="اختر وجهتك"
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      onBlur={handleSetDropoff}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">نوع التاكسي</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`p-4 rounded-lg border-2 transition-all ${
                        taxiType === 'normal'
                          ? 'border-[#D4A843] bg-[#D4A843]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setTaxiType('normal')}
                    >
                      <Car className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      <span className="font-medium">عادي</span>
                    </button>
                    <button
                      className={`p-4 rounded-lg border-2 transition-all ${
                        taxiType === 'super'
                          ? 'border-[#D4A843] bg-[#D4A843]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setTaxiType('super')}
                    >
                      <Car className="w-8 h-8 mx-auto mb-2 text-[#D4A843]" />
                      <span className="font-medium">سوبر</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleRequestTrip}
                  disabled={loading}
                  className="btn btn-primary w-full py-3"
                >
                  {loading ? 'جاري الإرسال...' : 'طلب رحلة'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="animate-pulse">
              <Car className="w-24 h-24 mx-auto text-[#D4A843] mb-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2">جاري البحث عن سائق...</h2>
            <p className="text-gray-500">يرجى الانتظار</p>
            <div className="mt-8">
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#D4A843] animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        )}

        {step === 'matched' && currentTrip && (
          <div className="max-w-md mx-auto">
            <div className="card">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-4">
                  <Car className="w-10 h-10 text-[#D4A843]" />
                </div>
                <h2 className="text-xl font-bold">{currentTrip.driver_name || 'السائق'}</h2>
                <p className="text-gray-500">قادم إليك الآن</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">{currentTrip.pickup_address}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Navigation className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">{currentTrip.dropoff_address}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#D4A843]/10 rounded-lg mb-6">
                <span className="font-medium">الأجرة</span>
                <span className="text-xl font-bold text-[#D4A843]">{currentTrip.fare?.toLocaleString()} د.ع</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStep('chat')} className="btn btn-outline py-3">
                  <MessageCircle className="w-5 h-5 ml-2" />
                  محادثة
                </button>
                <button className="btn btn-primary py-3">
                  <Phone className="w-5 h-5 ml-2" />
                  اتصال
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'chat' && currentTrip && (
          <div className="max-w-md mx-auto">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">محادثة مع السائق</h2>
                <button onClick={() => setStep('matched')} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Messages */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
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
              <div className="h-64 overflow-y-auto space-y-3 mb-4 p-2 bg-gray-50 rounded-lg">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">ابدأ المحادثة...</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'passenger' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.sender_type === 'passenger'
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
              <div className="flex gap-2">
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
      </main>
    </div>
  );
}
