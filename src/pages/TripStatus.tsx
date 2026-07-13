import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Trip, ChatMessage } from '../lib/supabase';
import { playNotificationSound } from '../lib/notification';
import { MapPin, Navigation, Car, MessageCircle, X, Send, Phone, ArrowRight, Check } from 'lucide-react';

const quickMessages = [
  "حسناً، في انتظارك ✅",
  "أنا أمام المبنى 🏢",
  "كم دقيقة تبقى؟ ⏱️",
  "شكراً 🙏",
  "أنا جاهز 👍",
];

export default function TripStatus() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    if (!tripId) return;
    const fetchTrip = async () => {
      const { data } = await supabase.from('trips').select('*').eq('id', tripId).single();
      if (data) setTrip(data);
    };
    fetchTrip();
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, (payload) => {
        const updatedTrip = payload.new as Trip;
        setTrip(updatedTrip);
        if (updatedTrip.status === 'accepted') {
          playNotificationSound();
          showNotification('✅ تم قبول طلبك، السائق في الطريق إليك', 'success');
        } else if (updatedTrip.status === 'arrived') {
          playNotificationSound();
          showNotification('🚕 وصل السائق إلى موقعك', 'info');
        } else if (updatedTrip.status === 'cancelled') {
          playNotificationSound();
          showNotification('❌ قام السائق بإلغاء الرحلة', 'error');
        } else if (updatedTrip.status === 'completed') {
          showNotification('✅ تم إكمال الرحلة بنجاح', 'success');
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  useEffect(() => {
    if (!tripId || !showChat) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('chat_messages').select('*').eq('trip_id', tripId).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
    const channel = supabase
      .channel(`chat-${tripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `trip_id=eq.${tripId}` }, (payload) => {
        const msg = payload.new as ChatMessage;
        setMessages((prev) => [...prev, msg]);
        if (msg.sender_type === 'driver') playNotificationSound();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId, showChat]);

  const showNotification = (message: string, type: string) => setNotification({ message, type });
  const requestNewTrip = () => navigate('/passenger');

  const sendMessage = async (messageText?: string) => {
    const text = messageText || newMessage;
    if (!text.trim() || !tripId) return;
    await supabase.from('chat_messages').insert({ trip_id: tripId, sender_type: 'passenger', message: text });
    setNewMessage('');
  };

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#D4A843] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل الرحلة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600">
            <Car className="w-6 h-6 text-[#D4A843]" />
            <span className="font-bold">تاكسي</span>
          </button>
          {trip.status === 'pending' && (
            <button onClick={requestNewTrip} className="flex items-center gap-2 text-[#D4A843]">
              <ArrowRight className="w-5 h-5" />
              طلب جديد
            </button>
          )}
        </div>
      </header>

      {notification && (
        <div className={`fixed top-16 left-4 right-4 z-50 p-4 rounded-lg shadow-lg animate-fade-in ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium text-sm">{notification.message}</p>
            {notification.type === 'error' && <button onClick={requestNewTrip} className="btn btn-primary text-sm py-1 px-2 whitespace-nowrap">طلب رحلة جديدة</button>}
            <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      <main className="container py-6">
        <div className="max-w-md mx-auto">
          <div className="card mb-4">
            <div className="text-center mb-6">
              {trip.status === 'pending' && (
                <div className="animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                    <Car className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h2 className="text-xl font-bold text-yellow-600">جاري البحث عن سائق...</h2>
                </div>
              )}
              {trip.status === 'accepted' && (
                <div>
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Car className="w-10 h-10 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold text-blue-600">السائق في الطريق!</h2>
                </div>
              )}
              {trip.status === 'arrived' && (
                <div>
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-green-600">السائق وصل!</h2>
                </div>
              )}
              {trip.status === 'completed' && (
                <div>
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-green-600">تمت الرحلة بنجاح!</h2>
                </div>
              )}
              {trip.status === 'cancelled' && (
                <div>
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <X className="w-10 h-10 text-red-500" />
                  </div>
                  <h2 className="text-xl font-bold text-red-600">تم إلغاء الرحلة</h2>
                </div>
              )}
            </div>

            {trip.driver_name && (trip.status === 'accepted' || trip.status === 'arrived') && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#D4A843]/10 flex items-center justify-center">
                    <Car className="w-6 h-6 text-[#D4A843]" />
                  </div>
                  <div>
                    <p className="font-bold">{trip.driver_name}</p>
                    <p className="text-sm text-gray-500">{trip.taxi_type === 'super' ? 'تاكسي سوبر' : 'تاكسي عادي'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{trip.pickup_address}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <Navigation className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{trip.dropoff_address}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#D4A843]/10 rounded-lg mb-4">
              <span className="font-medium">الاجرة المتوقعة</span>
              <span className="text-xl font-bold text-[#D4A843]">{trip.fare?.toLocaleString()} د.ع</span>
            </div>

            {(trip.status === 'accepted' || trip.status === 'arrived') && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowChat(true)} className="btn btn-outline py-3"><MessageCircle className="w-5 h-5 ml-2" />محادثة</button>
                <button className="btn btn-primary py-3"><Phone className="w-5 h-5 ml-2" />اتصال</button>
              </div>
            )}

            {(trip.status === 'cancelled' || trip.status === 'completed') && (
              <button onClick={requestNewTrip} className="btn btn-primary w-full py-3">طلب رحلة جديدة</button>
            )}
          </div>
        </div>
      </main>

      {showChat && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50" onClick={() => setShowChat(false)}>
          <div className="bg-white rounded-t-xl md:rounded-xl w-full max-w-md h-[70vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">محادثة مع السائق</h3>
              <button onClick={() => setShowChat(false)} className="text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2 overflow-x-auto p-2 border-b">
              {quickMessages.map((msg, idx) => (
                <button key={idx} onClick={() => sendMessage(msg)} className="shrink-0 px-3 py-1.5 text-sm border border-[#D4A843] text-[#D4A843] rounded-full hover:bg-[#D4A843] hover:text-white transition-colors whitespace-nowrap">{msg}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? <p className="text-center text-gray-400 py-8">ابدأ المحادثة...</p> : messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'passenger' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender_type === 'passenger' ? 'bg-[#D4A843] text-white' : 'bg-white border'}`}>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <input type="text" className="input flex-1" placeholder="اكتب رسالتك..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
              <button onClick={() => sendMessage()} className="btn btn-primary px-4"><Send className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
