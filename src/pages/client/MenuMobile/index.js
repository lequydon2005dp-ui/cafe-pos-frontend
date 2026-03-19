import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import '../../../styles/client/Mobile/MenuMobile.css';

// --- CONFIG API ---
const API_BASE_URL = 'http://172.20.10.2:8080';

// --- HELPER FORMAT SỐ ---
const roundToThousand = (value) => {
  if (!value) return 0;
  return Math.round(value / 1000) * 1000;
};

// --- COMPONENT ITEM (Cập nhật hiển thị Sale) ---
const MenuItem = ({ item, onClick, pricing }) => {
  return (
    <div className="menu-item2" onClick={() => onClick(item)}>
      <div className="item-image2">
        {/* 🔥 Hiển thị Badge Sale */}
        {pricing.hasDiscount && (
          <div className="sale-badge-mobile">
            SALE -{(pricing.discountPercent * 100).toFixed(0)}%
          </div>
        )}
        <img
          src={item.image && item.image.startsWith('http') ? item.image : 'https://via.placeholder.com/150'}
          alt={item.name}
          onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Coffee" }}
        />
      </div>
      <div className="item-details2">
        <div className="item-info2">
          <h3 className="item-name2">{item.name}</h3>
          <p className="item-desc2">{item.description || "Hương vị tuyệt hảo."}</p>
        </div>
        <div className="item-footer2">
          {/* 🔥 Hiển thị giá: Nếu giảm thì hiện giá cũ gạch ngang */}
          <div className="price-wrapper">
            {pricing.hasDiscount ? (
              <>
                <span className="price-old">{roundToThousand(pricing.originalPrice).toLocaleString()} đ</span>
                <span className="price-tag2 sale-text">{roundToThousand(pricing.finalPrice).toLocaleString()} đ</span>
              </>
            ) : (
              <span className="price-tag2">{roundToThousand(pricing.finalPrice).toLocaleString()} đ</span>
            )}
          </div>
          <div className="btn-add-icon2">+</div>
        </div>
      </div>
    </div>
  );
};

function MenuMobile() {
  // --- STATE ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Data bổ trợ
  const [sizesList, setSizesList] = useState([]);
  const [toppingsList, setToppingsList] = useState([]);
  const [discountsList, setDiscountsList] = useState([]); // 🔥 List giảm giá

  // Cart & Order
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // State Giảm giá Voucher
  const [inputCode, setInputCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  // Modal Tùy Chọn Sản Phẩm
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingCartItemIndex, setEditingCartItemIndex] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // State cho Modal
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNote, setOrderNote] = useState("");

  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table');

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🔥 Thêm API discounts vào Promise.all
        const [prodRes, catRes, sizeRes, topRes, discRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/products`),
          axios.get(`${API_BASE_URL}/api/categories`),
          axios.get(`${API_BASE_URL}/api/sizes`),
          axios.get(`${API_BASE_URL}/api/toppings`),
          axios.get(`${API_BASE_URL}/api/discounts`) // Lấy danh sách giảm giá
        ]);

        setProducts(prodRes.data.filter(p => p.active));
        setCategories(catRes.data);
        setSizesList(sizeRes.data);
        setToppingsList(topRes.data.filter(t => t.active));
        setDiscountsList(discRes.data.filter(d => d.active)); // Lưu discount
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        // Nếu API discounts lỗi (vd: 403), vẫn cho app chạy bình thường
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- 🔥 LOGIC TÍNH GIÁ SẢN PHẨM (GIỐNG POS) ---
  const getProductPricing = useCallback((product) => {
    if (!product) return { hasDiscount: false, finalPrice: 0, originalPrice: 0, discountPercent: 0 };

    // Tìm các mã giảm giá áp dụng cho sản phẩm này
    const validDiscounts = discountsList.filter(d => {
      if (!d.active) return false;
      // Kiểm tra ngày hết hạn
      if (d.expiryDate && new Date(d.expiryDate).getTime() < new Date().getTime()) return false;

      // Kiểm tra loại giảm giá (Cho sản phẩm cụ thể hay danh mục)
      // Lưu ý: Logic này tùy thuộc vào cấu trúc backend của bạn
      if (d.productIds && Array.isArray(d.productIds) && d.productIds.includes(product.id)) return true;
      if (d.products && Array.isArray(d.products) && d.products.some(p => p.id === product.id)) return true;

      return false;
    });

    if (validDiscounts.length === 0) {
      return { hasDiscount: false, finalPrice: product.price, originalPrice: product.price, discountPercent: 0 };
    }

    // Lấy giảm giá tốt nhất
    const bestDiscount = validDiscounts.reduce((prev, curr) => (prev.discountPercentage > curr.discountPercentage) ? prev : curr);

    return {
      hasDiscount: true,
      finalPrice: product.price * (1 - bestDiscount.discountPercentage),
      originalPrice: product.price,
      discountPercent: bestDiscount.discountPercentage
    };
  }, [discountsList]);

  // --- LỌC SẢN PHẨM ---
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'ALL') return products;
    return products.filter(p => p.category?.id === activeCategory || p.categoryId === activeCategory);
  }, [products, activeCategory]);

  // --- TÍNH TỔNG TIỀN MỘT MÓN (Đã bao gồm Size/Topping) ---
  const calculateItemTotal = (product, size, toppings, quantity) => {
    if (!product) return 0;

    // 🔥 Dùng giá đã giảm (nếu có) làm giá cơ sở
    const pricing = getProductPricing(product);
    let price = pricing.finalPrice;

    if (size) price += size.extraPrice || 0;
    if (toppings && toppings.length > 0) {
      const toppingsPrice = toppings.reduce((sum, tId) => {
        const t = toppingsList.find(i => i.id === tId);
        return sum + (t ? t.price : 0);
      }, 0);
      price += toppingsPrice;
    }
    return price * quantity;
  };

  // --- ACTION MODAL ---
  const openProductModal = (product, cartItemIndex = null) => {
    setSelectedProduct(product);
    setEditingCartItemIndex(cartItemIndex);

    if (cartItemIndex !== null) {
      const item = cart[cartItemIndex];
      const sizeObj = sizesList.find(s => s.id === item.sizeId) || null;
      setSelectedSize(sizeObj);
      setSelectedToppings(item.toppingIds || []);
      setOrderQuantity(item.quantity);
      setOrderNote(item.note || "");
    } else {
      setSelectedSize(sizesList[0] || null);
      setSelectedToppings([]);
      setOrderQuantity(1);
      setOrderNote("");
    }
    setIsProductModalOpen(true);
  };

  const handleConfirmAddToCart = () => {
    if (!selectedProduct) return;

    const toppingNames = selectedToppings.map(tId => {
      const t = toppingsList.find(i => i.id === tId);
      return t ? t.name : '';
    }).filter(Boolean).join(', ');

    // 🔥 Tính giá
    const pricing = getProductPricing(selectedProduct);
    // Giá 1 đơn vị (đã bao gồm size + topping + giá sản phẩm đã giảm)
    const unitPrice = calculateItemTotal(selectedProduct, selectedSize, selectedToppings, 1);

    const newItem = {
      id: selectedProduct.id,
      productName: selectedProduct.name,
      image: selectedProduct.image,
      basePrice: pricing.finalPrice, // Lưu giá đã giảm
      originalBasePrice: pricing.originalPrice, // Lưu giá gốc để tham khảo

      sizeId: selectedSize?.id,
      sizeName: selectedSize?.name,
      toppingIds: selectedToppings,
      toppingNames: toppingNames,
      note: orderNote,
      quantity: orderQuantity,
      price: unitPrice
    };

    setCart(prev => {
      const newCart = [...prev];
      if (editingCartItemIndex !== null) {
        newCart[editingCartItemIndex] = newItem;
      } else {
        newCart.push(newItem);
      }
      return newCart;
    });

    setIsProductModalOpen(false);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleRemoveCartItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
    if (newCart.length === 0) {
      setIsCartOpen(false);
      setAppliedDiscount(null);
    }
  };

  // --- 🔥 SỬA LỖI VOUCHER: Dùng list có sẵn thay vì gọi lại API ---
  const handleApplyDiscount = () => {
    if (!inputCode.trim()) return;

    // Tìm trong danh sách discountsList đã tải từ đầu
    const found = discountsList.find(d => d.code && d.code.toUpperCase() === inputCode.toUpperCase());

    if (!found) {
      alert("❌ Mã không tồn tại!");
      return;
    }
    // Check active
    if (!found.active) {
      alert("❌ Mã này hiện không hoạt động!");
      return;
    }
    // Check ngày hết hạn
    if (found.expiryDate && new Date(found.expiryDate) < new Date()) {
      alert("❌ Mã đã hết hạn!");
      return;
    }

    setAppliedDiscount(found);
    alert(`✅ Áp dụng mã ${found.code} thành công! (-${found.discountPercentage * 100}%)`);
    setInputCode("");
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
  };

  // --- TÍNH TOÁN ---
  const subTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = appliedDiscount ? subTotal * appliedDiscount.discountPercentage : 0;
  const finalTotal = subTotal - discountAmount;
  const cartTotalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  // --- GỬI ĐƠN ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (!window.confirm(`Xác nhận gọi ${totalItemsCount} món? Tổng tiền: ${roundToThousand(finalTotal).toLocaleString()} đ`)) return;

    setIsCartOpen(false);

    const orderItems = cart.map(item => ({
      productId: item.id,
      productName: item.productName,
      quantity: item.quantity,
      note: item.note,
      sizeId: item.sizeId,
      toppingIds: item.toppingIds
    }));

    const orderData = {
      customerName: tableNum ? `Bàn ${tableNum}` : "Khách Mobile",
      tableNumber: tableNum || "0",
      source: tableNum ? "QR_TABLE" : "MOBILE",
      items: orderItems,
      totalAmount: finalTotal,
      note: appliedDiscount ? `Voucher: ${appliedDiscount.code}` : ""
    };

    try {
      // Backend cần permitAll cho endpoint POST /api/orders
      await axios.post(`${API_BASE_URL}/api/orders`, orderData);
      alert("✅ Đã gửi món thành công! Bếp sẽ lên món ngay.");
      setCart([]);
      setAppliedDiscount(null);
    } catch (error) {
      console.error(error);
      alert("❌ Lỗi gửi đơn! Có thể do kết nối mạng.");
    }
  };

  return (
    <div className="mobile-menu-body2">
      <div className="menu-container2">
        <header className="menu-header2">
          <span className="brand-tag2">Coffee Shop</span>
          <h1>{tableNum ? `Bàn ${tableNum}` : 'Thực đơn'}</h1>
        </header>

        {/* DANH MỤC */}
        <div className="category-scroll-container">
          <div className="category-tabs">
            <button
              className={`cat-tab ${activeCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveCategory('ALL')}
            >
              Tất cả
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* GRID SẢN PHẨM */}
        <div className="menu-grid2">
          {loading ? <p style={{ textAlign: 'center', gridColumn: '1/-1', padding: 20 }}>Đang tải thực đơn...</p> :
            filteredProducts.map(item => {
              // 🔥 Tính giá cho từng item để truyền vào component
              const pricing = getProductPricing(item);
              return (
                <MenuItem
                  key={item.id}
                  item={item}
                  pricing={pricing}
                  onClick={() => openProductModal(item, null)}
                />
              );
            })
          }
        </div>
      </div>

      {/* FLOAT CART */}
      {cart.length > 0 && (
        <div className="floating-cart-container2">
          <div className="floating-cart2">
            <div className="cart-info-group2" onClick={() => setIsCartOpen(true)}>
              <span className="cart-count-label2">Giỏ hàng ({cartTotalQty})</span>
              <span className="cart-total-price2">
                {roundToThousand(finalTotal).toLocaleString()} đ
                {appliedDiscount && <small style={{ fontSize: '0.7em', opacity: 0.8, marginLeft: 5, textDecoration: 'line-through' }}>{roundToThousand(subTotal).toLocaleString()}</small>}
              </span>
            </div>
            <button className="btn-checkout2" onClick={handlePlaceOrder}>Gọi món</button>
          </div>
        </div>
      )}

      {/* POPUP GIỎ HÀNG */}
      {isCartOpen && createPortal(
        <>
          <div className="cart-overlay2" onClick={() => setIsCartOpen(false)}></div>
          <div className="cart-popup2">
            <div className="popup-header2">
              <span className="popup-title2">Xác nhận ({cartTotalQty})</span>
              <button className="btn-close2" onClick={() => setIsCartOpen(false)}>✕</button>
            </div>

            <div className="popup-list2">
              {cart.map((item, index) => (
                <div key={index} className="cart-row2" onClick={() => { setIsCartOpen(false); openProductModal(products.find(p => p.id === item.id), index); }}>
                  <div className="cart-item-left">
                    <div style={{ fontWeight: 'bold', fontSize: 15 }}>{item.productName}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {item.sizeName && <span>Size: {item.sizeName}</span>}
                      {item.toppingNames && <span> • {item.toppingNames}</span>}
                    </div>
                    {item.note && <div style={{ fontSize: 12, color: '#e67e22', fontStyle: 'italic' }}>📝 {item.note}</div>}
                    <div style={{ fontWeight: 'bold', marginTop: 4 }}>{roundToThousand(item.price * item.quantity).toLocaleString()} đ</div>
                  </div>

                  <div className="cart-item-right">
                    <span className="qty-badge">x{item.quantity}</span>
                    <button className="btn-delete2" onClick={(e) => { e.stopPropagation(); handleRemoveCartItem(index); }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>

            {/* MÃ GIẢM GIÁ */}
            <div className="discount-area" style={{ padding: '10px 20px', background: '#f9f9f9', borderTop: '1px solid #eee' }}>
              {!appliedDiscount ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Nhập mã giảm giá..."
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px',
                      border: '1px solid #ddd', fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={handleApplyDiscount}
                    style={{
                      padding: '0 15px', borderRadius: '8px', border: 'none',
                      background: '#1F2937', color: 'white', fontWeight: 'bold'
                    }}
                  >
                    ÁP DỤNG
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#e8f5e9', padding: '10px', borderRadius: '8px', border: '1px solid #c8e6c9'
                }}>
                  <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    🏷️ {appliedDiscount.code} (-{appliedDiscount.discountPercentage * 100}%)
                  </span>
                  <button
                    onClick={handleRemoveDiscount}
                    style={{ background: 'transparent', border: 'none', color: '#d32f2f', fontWeight: 'bold', fontSize: '18px' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: 20, paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '14px', color: '#666' }}>
                <span>Tạm tính:</span>
                <span>{roundToThousand(subTotal).toLocaleString()} đ</span>
              </div>
              {appliedDiscount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '14px', color: '#2e7d32' }}>
                  <span>Giảm giá:</span>
                  <span>- {roundToThousand(discountAmount).toLocaleString()} đ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                <span>Tổng cộng:</span>
                <span>{roundToThousand(finalTotal).toLocaleString()} đ</span>
              </div>

              <button className="btn-checkout3" style={{ width: '100%', background: '#1F2937' }} onClick={handlePlaceOrder}>
                XÁC NHẬN
              </button>
            </div>
          </div>
        </>, document.body
      )}

      {/* PRODUCT MODAL */}
      {isProductModalOpen && selectedProduct && createPortal(
        <>
          <div className="modal-overlay2" onClick={() => setIsProductModalOpen(false)}></div>
          <div className="product-modal2">
            <div className="pm-header">
              <img src={selectedProduct.image || 'https://via.placeholder.com/100'} alt="" className="pm-thumb" />
              <div>
                <h3>{selectedProduct.name}</h3>
                {/* Hiển thị giá trong modal cũng cần logic giảm giá */}
                {(() => {
                  const p = getProductPricing(selectedProduct);
                  return p.hasDiscount ? (
                    <div>
                      <span style={{ color: '#e74c3c', fontWeight: 'bold', marginRight: 5 }}>{roundToThousand(p.finalPrice).toLocaleString()} đ</span>
                      <span style={{ textDecoration: 'line-through', color: '#999', fontSize: 13 }}>{roundToThousand(p.originalPrice).toLocaleString()} đ</span>
                    </div>
                  ) : (
                    <div style={{ color: '#e74c3c', fontWeight: 'bold' }}>{roundToThousand(p.finalPrice).toLocaleString()} đ</div>
                  )
                })()}
              </div>
              <button className="pm-close" onClick={() => setIsProductModalOpen(false)}>✕</button>
            </div>

            <div className="pm-body">
              <div className="pm-section">
                <div className="pm-section-title">Chọn Size</div>
                <div className="pm-options-grid">
                  {sizesList.map(s => (
                    <div
                      key={s.id}
                      className={`pm-option-pill ${selectedSize?.id === s.id ? 'active' : ''}`}
                      onClick={() => setSelectedSize(s)}
                    >
                      {s.name} (+{s.extraPrice})
                    </div>
                  ))}
                </div>
              </div>

              <div className="pm-section">
                <div className="pm-section-title">Topping</div>
                <div className="pm-options-list">
                  {toppingsList.map(t => (
                    <div key={t.id} className="pm-checkbox-row" onClick={() => {
                      setSelectedToppings(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]);
                    }}>
                      <input type="checkbox" checked={selectedToppings.includes(t.id)} readOnly />
                      <span>{t.name} (+{t.price})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pm-section">
                <div className="pm-section-title">Ghi chú</div>
                <textarea
                  className="pm-note-input"
                  placeholder="Vd: Ít đá, nhiều sữa..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                />
              </div>

              <div className="pm-qty-control">
                <button onClick={() => setOrderQuantity(q => Math.max(1, q - 1))}>-</button>
                <span>{orderQuantity}</span>
                <button onClick={() => setOrderQuantity(q => q + 1)}>+</button>
              </div>
            </div>

            <div className="pm-footer">
              <button className="btn-confirm-add" onClick={handleConfirmAddToCart}>
                {editingCartItemIndex !== null ? 'CẬP NHẬT' : 'THÊM VÀO GIỎ'} - {roundToThousand(calculateItemTotal(selectedProduct, selectedSize, selectedToppings, orderQuantity)).toLocaleString()} đ
              </button>
            </div>
          </div>
        </>, document.body
      )}

      {/* --- CSS BỔ SUNG --- */}
    </div>
  );
}

export default MenuMobile;