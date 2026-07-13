import { Link } from 'react-router-dom';
import { Car, Users, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="w-8 h-8 text-[#D4A843]" />
          <span className="text-xl font-bold text-white">تاكسي</span>
        </div>
        <Link to="/admin" className="text-[#D4A843] text-sm hover:underline">
          لوحة التحكم
        </Link>
      </header>

      {/* Hero */}
      <main className="container py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            خدمة التوصيل الذكية
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            احصل على رحلة آمنة ومريحة في أي وقت. سائقون محترفون وأسعار مناسبة.
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link to="/passenger" className="card bg-white hover:shadow-lg transition-shadow">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-[#D4A843]" />
              </div>
              <h2 className="text-2xl font-bold mb-2">راكب</h2>
              <p className="text-gray-500">اطلب رحلتك الآن</p>
            </div>
          </Link>

          <Link to="/driver" className="card bg-white hover:shadow-lg transition-shadow">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-4">
                <Car className="w-10 h-10 text-[#D4A843]" />
              </div>
              <h2 className="text-2xl font-bold mb-2">سائق</h2>
              <p className="text-gray-500">ابدأ العمل معنا</p>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 mt-16 max-w-4xl mx-auto">
          <div className="text-center p-4">
            <Shield className="w-10 h-10 text-[#D4A843] mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">آمن وموثوق</h3>
            <p className="text-gray-400 text-sm">سائقون معتمدون</p>
          </div>
          <div className="text-center p-4">
            <Car className="w-10 h-10 text-[#D4A843] mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">رحلات مريحة</h3>
            <p className="text-gray-400 text-sm">سيارات حديثة</p>
          </div>
          <div className="text-center p-4">
            <Users className="w-10 h-10 text-[#D4A843] mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">دعم 24/7</h3>
            <p className="text-gray-400 text-sm">خطة مساعدة مستمرة</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        <p>جميع الحقوق محفوظة © 2024</p>
      </footer>
    </div>
  );
}
