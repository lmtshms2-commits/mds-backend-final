import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  // ============ حالة المستخدم ============
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('pharmacy');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('login');

  // ============ بيانات التطبيق ============
  const [medicines, setMedicines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminMedicines, setAdminMedicines] = useState([]);

  // ============ نموذج التسجيل ============
  const [registerData, setRegisterData] = useState({
    name: '', phone: '', email: '', address: '', role: 'pharmacy',
    password: '', confirmPassword: '',
    commercialRegister: '', licenseNumber: '', idNumber: ''
  });

  // ============ الباركود ============
  const [showScanner, setShowScanner] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempNote, setTempNote] = useState('');

  // ============ التوصيل والموقع ============
  const [pharmacyAddress, setPharmacyAddress] = useState('');
  const [pharmacyLocation, setPharmacyLocation] = useState({ lat: 0, lng: 0 });
  const [distance, setDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const DELIVERY_RATE_PER_KM = 1000;

  // ============ تحميل البيانات حسب الدور ============
  useEffect(() => {
    if (user) {
      if (user.role === 'company') {
        fetchMedicines();
      } else if (user.role === 'pharmacy') {
        fetchMedicines();
        fetchOrders('pharmacy');
        if (user.address) setPharmacyAddress(user.address);
        if (user.location) setPharmacyLocation(user.location);
      } else if (user.role === 'driver') {
        fetchOrders('driver');
      } else if (user.role === 'admin') {
        fetchAdminStats();
        fetchAdminUsers();
        fetchAdminOrders();
        fetchAdminMedicines();
      }
    }
  }, [user]);

  // ============ دوال جلب البيانات ============
  const fetchMedicines = async () => {
    try {
      const res = await api.get('/medicines');
      setMedicines(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrders = async (type) => {
    try {
      let res;
      if (type === 'pharmacy') {
        res = await api.get(`/orders/pharmacy/${user.id}`);
      } else {
        res = await api.get('/orders/all');
      }
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAdminOrders = async () => {
    try {
      const res = await api.get('/admin/orders');
      setAdminOrders(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAdminMedicines = async () => {
    try {
      const res = await api.get('/admin/medicines');
      setAdminMedicines(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  // ============ تسجيل الدخول ============
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/users/login', { phone, password, role });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      setMessage(`مرحباً ${response.data.user.name}!`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'خطأ في تسجيل الدخول');
    }
  };

  // ============ تسجيل حساب جديد ============
  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      setMessage('❌ كلمة السر غير متطابقة');
      return;
    }
    try {
      const payload = {
        name: registerData.name,
        phone: registerData.phone,
        email: registerData.email,
        address: registerData.address,
        role: registerData.role,
        password: registerData.password,
        commercialRegister: registerData.commercialRegister,
        licenseNumber: registerData.licenseNumber,
        idNumber: registerData.idNumber
      };
      const response = await api.post('/users/register', payload);
      setMessage(response.data.message);
      setActiveTab('login');
      setRegisterData({
        name: '', phone: '', email: '', address: '', role: 'pharmacy',
        password: '', confirmPassword: '',
        commercialRegister: '', licenseNumber: '', idNumber: ''
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'خطأ في التسجيل');
    }
  };

  // ============ تسجيل الخروج ============
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCart([]);
    setMessage('تم تسجيل الخروج');
  };

  // ============ إدارة الأدوية (لشركة الأدوية) ============
  const addMedicine = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      company: formData.get('company'),
      quantity: parseInt(formData.get('quantity')),
      price: parseInt(formData.get('price')),
      expiryDate: formData.get('expiryDate')
    };
    try {
      await api.post('/medicines', data);
      fetchMedicines();
      e.target.reset();
      setMessage('✅ تم إضافة الدواء');
    } catch (error) {
      setMessage('❌ خطأ في الإضافة');
    }
  };

  // ============ سلة المشتريات ============
  const openQuantityModal = (medicine) => {
    setSelectedMedicine(medicine);
    setTempQuantity(1);
    setTempNote('');
    setShowQuantityModal(true);
  };

  const addToCartWithDetails = () => {
    if (tempQuantity < 1) {
      setMessage('⚠️ الكمية يجب أن تكون 1 على الأقل');
      return;
    }
    if (tempQuantity > selectedMedicine.quantity) {
      setMessage(`⚠️ الكمية المتاحة فقط ${selectedMedicine.quantity}`);
      return;
    }
    const existingIndex = cart.findIndex(item => item._id === selectedMedicine._id);
    if (existingIndex !== -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += tempQuantity;
      if (tempNote) updatedCart[existingIndex].note = tempNote;
      setCart(updatedCart);
    } else {
      setCart([{ ...selectedMedicine, quantity: tempQuantity, note: tempNote }]);
    }
    setShowQuantityModal(false);
    setMessage(`✅ تم إضافة ${tempQuantity} من ${selectedMedicine.name}`);
  };

  const updateCartQuantity = (index, newQuantity) => {
    if (newQuantity < 1) {
      const newCart = cart.filter((_, i) => i !== index);
      setCart(newCart);
      return;
    }
    const updatedCart = [...cart];
    updatedCart[index].quantity = newQuantity;
    setCart(updatedCart);
  };

  const removeFromCart = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
  };

  const updateCartNote = (index, note) => {
    const updatedCart = [...cart];
    updatedCart[index].note = note;
    setCart(updatedCart);
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const getTotalWithDelivery = () => getSubtotal() + deliveryFee;

  // ============ إنشاء طلب ============
  const createOrder = async () => {
    if (cart.length === 0) {
      setMessage('⚠️ السلة فارغة');
      return;
    }
    const orderMedicines = cart.map(item => ({
      medicineId: item._id, name: item.name, quantity: item.quantity, price: item.price, note: item.note || ''
    }));
    try {
      await api.post('/orders', {
        pharmacy: user.id,
        pharmacyAddress: pharmacyAddress,
        pharmacyLocation: pharmacyLocation,
        medicines: orderMedicines,
        subtotal: getSubtotal(),
        deliveryFee: deliveryFee,
        totalPrice: getTotalWithDelivery(),
        distance: distance
      });
      setCart([]);
      setDeliveryFee(0);
      setDistance(0);
      setMessage('✅ تم إنشاء الطلب');
      fetchOrders('pharmacy');
    } catch (error) {
      setMessage('❌ خطأ في إنشاء الطلب');
    }
  };

  // ============ تحديث حالة الطلب (للسائق) ============
  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status, driver: user.id });
      fetchOrders('driver');
      setMessage('✅ تم تحديث الحالة');
    } catch (error) {
      setMessage('❌ خطأ في التحديث');
    }
  };

  // ============ إدارة المستخدمين (لأدمن) ============
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}`, { isActive: !currentStatus });
      fetchAdminUsers();
      setMessage('✅ تم تحديث حالة المستخدم');
    } catch (error) {
      setMessage('❌ خطأ في التحديث');
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await api.delete(`/admin/users/${userId}`);
        fetchAdminUsers();
        setMessage('✅ تم حذف المستخدم');
      } catch (error) {
        setMessage('❌ خطأ في الحذف');
      }
    }
  };

  // ============ تحديد الموقع ============
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('⚠️ متصفحك لا يدعم تحديد الموقع');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPharmacyLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setMessage('✅ تم تحديد موقع الصيدلية');
      },
      (error) => setMessage('❌ فشل تحديد الموقع: ' + error.message)
    );
  };

  // ============ الباركود ============
  const onScanSuccess = (decodedText) => {
    setShowScanner(false);
    const nameInput = document.querySelector('input[name="name"]');
    if (nameInput) nameInput.value = decodedText;
    alert(`✅ تم قراءة الباركود: ${decodedText}`);
  };

  const startScanner = () => {
    setShowScanner(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(onScanSuccess, () => {});
    }, 100);
  };

  // ============ واجهة تسجيل الدخول / التسجيل ============
  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial' }}>
        <h1>💊 M.D.S pharmacies</h1>
        <h3>نظام إدارة وتوصيل الأدوية - عدن</h3>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '30px 0' }}>
          <button onClick={() => setActiveTab('login')} style={{ padding: '10px 30px', background: activeTab === 'login' ? '#28a745' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>دخول</button>
          <button onClick={() => setActiveTab('register')} style={{ padding: '10px 30px', background: activeTab === 'register' ? '#28a745' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>تسجيل جديد</button>
        </div>

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} style={{ maxWidth: '350px', margin: 'auto' }}>
            <input type="text" placeholder="رقم الجوال" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} required />
            <input type="password" placeholder="كلمة السر" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} required />
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }}>
              <option value="pharmacy">صيدلية</option>
              <option value="company">شركة أدوية</option>
              <option value="driver">سائق</option>
              <option value="admin">مدير النظام</option>
            </select>
            <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' }}>دخول</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ maxWidth: '500px', margin: 'auto', textAlign: 'right' }}>
            <input type="text" placeholder="الاسم الكامل" value={registerData.name} onChange={(e) => setRegisterData({...registerData, name: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} required />
            <input type="text" placeholder="رقم الجوال" value={registerData.phone} onChange={(e) => setRegisterData({...registerData, phone: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} required />
            <input type="email" placeholder="البريد الإلكتروني" value={registerData.email} onChange={(e) => setRegisterData({...registerData, email: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} />
            <input type="text" placeholder="العنوان" value={registerData.address} onChange={(e) => setRegisterData({...registerData, address: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} />
            
            <select value={registerData.role} onChange={(e) => setRegisterData({...registerData, role: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }}>
              <option value="pharmacy">صيدلية</option>
              <option value="company">شركة أدوية</option>
              <option value="driver">سائق</option>
            </select>

            {registerData.role === 'company' && (
              <input type="text" placeholder="السجل التجاري" value={registerData.commercialRegister} onChange={(e) => setRegisterData({...registerData, commercialRegister: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} />
            )}
            {registerData.role === 'pharmacy' && (
              <input type="text" placeholder="رقم الترخيص" value={registerData.licenseNumber} onChange={(e) => setRegisterData({...registerData, licenseNumber: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} />
            )}
            {registerData.role === 'driver' && (
              <input type="text" placeholder="رقم الهوية" value={registerData.idNumber} onChange={(e) => setRegisterData({...registerData, idNumber: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} />
            )}

            <input type="password" placeholder="كلمة السر" value={registerData.password} onChange={(e) => setRegisterData({...registerData, password: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} required />
            <input type="password" placeholder="تأكيد كلمة السر" value={registerData.confirmPassword} onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ccc' }} required />
            
            <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' }}>تسجيل</button>
          </form>
        )}
        {message && <p style={{ marginTop: '20px', color: message.includes('✅') || message.includes('مرحباً') ? 'green' : 'red' }}>{message}</p>}
      </div>
    );
  }

  // ============ لوحة تحكم الأدمن ============
  if (user.role === 'admin') {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial', direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <h1>👑 M.D.S pharmacies - لوحة التحكم</h1>
          <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>تسجيل خروج</button>
        </div>
        <h3>مرحباً {user.name}</h3>

        {/* الإحصائيات */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', margin: '20px 0' }}>
          <div style={{ background: '#17a2b8', padding: '15px', borderRadius: '10px', flex: 1, textAlign: 'center', color: 'white' }}>🏥 الصيدليات: {stats.totalPharmacies || 0}</div>
          <div style={{ background: '#28a745', padding: '15px', borderRadius: '10px', flex: 1, textAlign: 'center', color: 'white' }}>🏭 شركات الأدوية: {stats.totalCompanies || 0}</div>
          <div style={{ background: '#ffc107', padding: '15px', borderRadius: '10px', flex: 1, textAlign: 'center' }}>🚗 السائقين: {stats.totalDrivers || 0}</div>
          <div style={{ background: '#007bff', padding: '15px', borderRadius: '10px', flex: 1, textAlign: 'center', color: 'white' }}>💊 الأدوية: {stats.totalMedicines || 0}</div>
          <div style={{ background: '#6c5ce7', padding: '15px', borderRadius: '10px', flex: 1, textAlign: 'center', color: 'white' }}>📦 الطلبات: {stats.totalOrders || 0}</div>
          <div style={{ background: '#e84393', padding: '15px', borderRadius: '10px', flex: 1, textAlign: 'center', color: 'white' }}>💰 الإيرادات: {stats.totalRevenue?.toLocaleString() || 0} ﷼</div>
        </div>

        {/* تبويبات */}
        <div style={{ display: 'flex', gap: '10px', margin: '20px 0', borderBottom: '1px solid #ddd' }}>
          {['users', 'medicines', 'orders'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 20px', background: activeTab === tab ? '#28a745' : 'transparent', color: activeTab === tab ? 'white' : '#333', border: 'none', cursor: 'pointer' }}>{tab === 'users' ? '👥 المستخدمين' : tab === 'medicines' ? '💊 الأدوية' : '📦 الطلبات'}</button>
          ))}
        </div>

        {/* المستخدمين */}
        {activeTab === 'users' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ border: '1px solid #ddd', padding: '8px' }}>الاسم</th><th>الجوال</th><th>الدور</th><th>العنوان</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}><td style={{ border: '1px solid #ddd', padding: '8px' }}>{u.name}</td><td>{u.phone}</td><td>{u.role === 'pharmacy' ? 'صيدلية' : u.role === 'company' ? 'شركة' : u.role === 'driver' ? 'سائق' : 'مدير'}</td><td>{u.address || '-'}</td><td style={{ color: u.isActive ? 'green' : 'red' }}>{u.isActive ? 'نشط' : 'موقوف'}</td>
                  <td><button onClick={() => toggleUserStatus(u._id, u.isActive)} style={{ background: u.isActive ? '#ffc107' : '#28a745', color: 'black', border: 'none', padding: '5px 10px', margin: '2px', borderRadius: '3px', cursor: 'pointer' }}>{u.isActive ? 'إيقاف' : 'تفعيل'}</button>
                  <button onClick={() => deleteUser(u._id)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', margin: '2px', borderRadius: '3px', cursor: 'pointer' }}>حذف</button></td></tr>
              ))}
            </tbody>
          </table>
        )}

        {/* الأدوية */}
        {activeTab === 'medicines' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th>الاسم</th><th>الشركة</th><th>الكمية</th><th>السعر</th><th>إجراءات</th></tr></thead>
            <tbody>
              {adminMedicines.map(m => (
                <tr key={m._id}><td>{m.name}</td><td>{m.company}</td><td>{m.quantity}</td><td>{m.price} ﷼</td>
                  <td><button onClick={async () => { if(window.confirm('حذف؟')){ await api.delete(`/admin/medicines/${m._id}`); fetchAdminMedicines(); } }} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>حذف</button></td></tr>
              ))}
            </tbody>
          </table>
        )}

        {/* الطلبات */}
        {activeTab === 'orders' && adminOrders.map(o => (
          <div key={o._id} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '10px', borderRadius: '5px' }}>
            <p><strong>رقم الطلب:</strong> {o._id}</p>
            <p><strong>الصيدلية:</strong> {o.pharmacy?.name || 'غير معروف'}</p>
            <p><strong>السائق:</strong> {o.driver?.name || 'لم يعين'}</p>
            <p><strong>المجموع:</strong> {o.totalPrice} ﷼ | <strong>التوصيل:</strong> {o.deliveryFee} ﷼</p>
            <p><strong>الحالة:</strong> {o.status === 'pending' ? '⏳ قيد الانتظار' : o.status === 'confirmed' ? '✅ مؤكد' : o.status === 'shipped' ? '🚚 قيد التوصيل' : '📦 تم'}</p>
          </div>
        ))}
        {message && <p style={{ color: message.includes('✅') ? 'green' : 'red' }}>{message}</p>}
      </div>
    );
  }

  // ============ لوحة تحكم شركة الأدوية ============
  if (user.role === 'company') {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial', direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>🏭 M.D.S pharmacies - شركة أدوية</h1>
          <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>تسجيل خروج</button>
        </div>
        <h3>مرحباً {user.name}</h3>

        <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '10px', margin: '20px 0' }}>
          <h3>➕ إضافة دواء جديد</h3>
          <button onClick={startScanner} style={{ padding: '10px 20px', background: '#6c5ce7', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '15px' }}>📷 مسح الباركود</button>
          {showScanner && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '90%', maxWidth: '500px' }}>
                <h4>امسح الباركود</h4>
                <div id="reader" style={{ width: '100%' }}></div>
                <button onClick={() => setShowScanner(false)} style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>إغلاق</button>
              </div>
            </div>
          )}
          <form onSubmit={addMedicine} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input type="text" name="name" placeholder="اسم الدواء" required style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: 1 }} />
            <input type="text" name="company" placeholder="الشركة" required style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: 1 }} />
            <input type="number" name="quantity" placeholder="الكمية" required style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: 1 }} />
            <input type="number" name="price" placeholder="السعر" required style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: 1 }} />
            <input type="date" name="expiryDate" style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: 1 }} />
            <button type="submit" style={{ padding: '8px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>إضافة</button>
          </form>
        </div>

        <h3>📋 قائمة الأدوية</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>الاسم</th><th>الشركة</th><th>الكمية</th><th>السعر</th></tr></thead>
          <tbody>{medicines.map(m => (<tr key={m._id}><td>{m.name}</td><td>{m.company}</td><td>{m.quantity}</td><td>{m.price} ﷼</td></tr>))}</tbody>
        </table>
        {message && <p style={{ color: message.includes('✅') ? 'green' : 'red' }}>{message}</p>}
      </div>
    );
  }

  // ============ لوحة تحكم الصيدلية ============
  if (user.role === 'pharmacy') {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial', direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>🏥 M.D.S pharmacies - صيدلية</h1>
          <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>تسجيل خروج</button>
        </div>
        <h3>مرحباً {user.name}</h3>

        {showQuantityModal && selectedMedicine && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
              <h3>{selectedMedicine.name}</h3>
              <p>السعر: {selectedMedicine.price} ﷼ | المتوفر: {selectedMedicine.quantity}</p>
              <input type="number" min="1" max={selectedMedicine.quantity} value={tempQuantity} onChange={(e) => setTempQuantity(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px' }} />
              <textarea placeholder="ملاحظات..." value={tempNote} onChange={(e) => setTempNote(e.target.value)} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', minHeight: '80px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={addToCartWithDetails} style={{ flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>إضافة</button>
                <button onClick={() => setShowQuantityModal(false)} style={{ flex: 1, padding: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>إلغاء</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, background: '#f0f0f0', padding: '20px', borderRadius: '10px' }}>
            <h3>📦 قائمة الأدوية</h3>
            {medicines.map(m => (
              <div key={m._id} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><strong>{m.name}</strong><br />{m.price} ﷼ | المتوفر: {m.quantity}</div>
                <button onClick={() => openQuantityModal(m)} style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>➕ طلب</button>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, background: '#f0f0f0', padding: '20px', borderRadius: '10px' }}>
            <h3>🛒 السلة</h3>
            <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
              <h4>📍 معلومات التوصيل</h4>
              <input type="text" placeholder="عنوان الصيدلية" value={pharmacyAddress} onChange={(e) => setPharmacyAddress(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '5px' }} />
              <button onClick={getCurrentLocation} style={{ padding: '8px 15px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' }}>📍 تحديد موقعي</button>
            </div>
            {cart.length === 0 ? <p>السلة فارغة</p> : (
              <>
                {cart.map((item, idx) => (
                  <div key={idx} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '10px', borderRadius: '5px' }}>
                    <div><strong>{item.name}</strong> x {item.quantity} = {item.price * item.quantity} ﷼</div>
                    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                      <button onClick={() => updateCartQuantity(idx, item.quantity - 1)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}>-</button>
                      <button onClick={() => updateCartQuantity(idx, item.quantity + 1)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}>+</button>
                      <button onClick={() => removeFromCart(idx)} style={{ background: '#ffc107', border: 'none', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}>🗑️</button>
                    </div>
                    <input type="text" placeholder="ملاحظات" value={item.note || ''} onChange={(e) => updateCartNote(idx, e.target.value)} style={{ width: '100%', marginTop: '5px', padding: '5px', borderRadius: '5px' }} />
                  </div>
                ))}
                <hr /><p>مجموع الأدوية: {getSubtotal()} ﷼</p>
                <p>سعر التوصيل: {deliveryFee} ﷼</p>
                <p><strong>الإجمالي: {getTotalWithDelivery()} ﷼</strong></p>
                <button onClick={createOrder} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' }}>📦 إنشاء طلب</button>
              </>
            )}
          </div>
        </div>

        <h3>📋 طلباتي السابقة</h3>
        {orders.map(o => (
          <div key={o._id} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '10px', borderRadius: '5px' }}>
            <p><strong>{new Date(o.createdAt).toLocaleString()}</strong> - {o.status === 'pending' ? '⏳ قيد الانتظار' : o.status === 'confirmed' ? '✅ مؤكد' : o.status === 'shipped' ? '🚚 قيد التوصيل' : '📦 تم'} - {o.totalPrice} ﷼</p>
          </div>
        ))}
        {message && <p style={{ color: message.includes('✅') ? 'green' : 'red' }}>{message}</p>}
      </div>
    );
  }

  // ============ لوحة تحكم السائق ============
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🚗 M.D.S pharmacies - سائق</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>تسجيل خروج</button>
      </div>
      <h3>مرحباً {user.name}</h3>
      <h3>📋 الطلبات المتاحة</h3>
      {orders.map(o => (
        <div key={o._id} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '10px', borderRadius: '5px' }}>
          <p><strong>رقم الطلب:</strong> {o._id.slice(-8)}</p>
          <p><strong>العنوان:</strong> {o.pharmacyAddress || 'غير محدد'}</p>
          <p><strong>سعر التوصيل:</strong> {o.deliveryFee} ﷼ | <strong>الإجمالي:</strong> {o.totalPrice} ﷼</p>
          <p><strong>الحالة:</strong> {o.status === 'pending' ? '⏳ قيد الانتظار' : o.status === 'confirmed' ? '✅ مؤكد' : o.status === 'shipped' ? '🚚 قيد التوصيل' : '📦 تم'}</p>
          {o.status === 'confirmed' && <button onClick={() => updateOrderStatus(o._id, 'shipped')} style={{ padding: '5px 15px', background: '#ffc107', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🚚 بدء التوصيل</button>}
          {o.status === 'shipped' && <button onClick={() => updateOrderStatus(o._id, 'delivered')} style={{ padding: '5px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>✅ تم التوصيل</button>}
        </div>
      ))}
      {message && <p style={{ color: message.includes('✅') ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}

export default App;
