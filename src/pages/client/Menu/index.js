import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { VNPayService } from '../../../service/VNPayService';
import '../../../styles/client/Pos/MenuPos.css';

// --- CSS ANIMATION ---
const animationStyles = `
  @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
  @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  
  .anim-success { animation: popIn 0.5s ease-out forwards; }
  .anim-error { animation: shake 0.5s ease-in-out; }
  .loader-spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px; }
  
  .status-icon { font-size: 60px; margin-bottom: 15px; display: block; }
  .success-icon { color: #27ae60; }
  .error-icon { color: #e74c3c; }
`;

const API_BASE_URL = 'http://172.20.10.2:8080';

const CustomerOrder = () => {
    // --- STATE ---
    const [products, setProducts] = useState([]);
    const [toppingsList, setToppingsList] = useState([]);
    const [sizesList, setSizesList] = useState([]);
    const [discountsList, setDiscountsList] = useState([]);
    const [cart, setCart] = useState([]);
    const [stompClient, setStompClient] = useState(null);
    const [appliedDiscount, setAppliedDiscount] = useState(null);

    // === STATE TÍCH ĐIỂM ===
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPoints, setCustomerPoints] = useState(0);
    const [usePoints, setUsePoints] = useState(false);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [suggestedCustomers, setSuggestedCustomers] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // NEW: STATE ĐỒNG BỘ ĐIỂM TỪ STAFF
    const [syncedUsePoints, setSyncedUsePoints] = useState(false);
    const [syncedPointsUsed, setSyncedPointsUsed] = useState(0);
    const [syncedPointsDiscount, setSyncedPointsDiscount] = useState(0);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tableParam = searchParams.get('table');
    const channelId = tableParam ? tableParam : "counter";

    // --- MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [orderNote, setOrderNote] = useState("");
    const [orderQuantity, setOrderQuantity] = useState(1);
    const [selectedToppings, setSelectedToppings] = useState([]);
    const [selectedSize, setSelectedSize] = useState(null);

    const [paymentState, setPaymentState] = useState({
        status: 'NONE',
        transactionCode: '',
        vnpayLink: '',
        message: '',
        tableInfo: null
    });

    // --- REFS & STORAGE ---
    const cartRef = useRef([]);
    const isProcessingRef = useRef(false);

    // === HÀM CẬP NHẬT GIỎ HÀNG ===
    const updateCart = useCallback((newCart) => {
        setCart(newCart);
        cartRef.current = newCart;
        localStorage.setItem(`pos_backup_cart_${channelId}`, JSON.stringify(newCart));
    }, [channelId]);

    // === TÍNH TOÁN GIÁ ===
    const getProductPricing = useCallback((product) => {
        if (!product) return { hasDiscount: false, finalPrice: 0, originalPrice: 0, discountPercent: 0 };
        const validDiscounts = discountsList.filter(d => {
            if (!d.active) return false;
            if (d.expiryDate && new Date(d.expiryDate).getTime() < new Date().getTime()) return false;
            if (d.productIds?.includes(product.id)) return true;
            if (d.products?.some(p => p.id === product.id)) return true;
            return false;
        });

        if (validDiscounts.length === 0) return { hasDiscount: false, finalPrice: product.price, originalPrice: product.price, discountPercent: 0 };
        const bestDiscount = validDiscounts.reduce((prev, curr) => (prev.discountPercentage > curr.discountPercentage) ? prev : curr);
        return {
            hasDiscount: true,
            finalPrice: product.price * (1 - bestDiscount.discountPercentage),
            originalPrice: product.price,
            discountPercent: bestDiscount.discountPercentage
        };
    }, [discountsList]);

    const calculateModalTotal = useCallback(() => {
        if (!selectedProduct) return 0;
        const pricing = getProductPricing(selectedProduct);
        const toppingsPrice = toppingsList.filter(t => selectedToppings.includes(t.id)).reduce((sum, t) => sum + t.price, 0);
        const sizePrice = selectedSize?.extraPrice || 0;
        return (pricing.finalPrice + sizePrice + toppingsPrice) * orderQuantity;
    }, [selectedProduct, selectedSize, selectedToppings, toppingsList, orderQuantity, getProductPricing]);

    const subTotal = useMemo(() => cart.reduce((s, i) => s + (i.price * i.quantity), 0), [cart]);
    const discountAmount = useMemo(() => appliedDiscount ? subTotal * appliedDiscount.discountPercentage : 0, [subTotal, appliedDiscount]);

    // !!! TÍNH TOÁN ĐIỂM DỰA TRÊN DỮ LIỆU ĐỒNG BỘ TỪ STAFF !!!
    const displayPointsDiscount = useMemo(() => syncedUsePoints ? syncedPointsDiscount : 0, [syncedUsePoints, syncedPointsDiscount]);
    const displayPointsUsed = useMemo(() => syncedUsePoints ? syncedPointsUsed : 0, [syncedUsePoints, syncedPointsUsed]);

    const finalTotal = useMemo(() => Math.max(0, subTotal - discountAmount - displayPointsDiscount), [subTotal, discountAmount, displayPointsDiscount]);

    // === GROUPED PRODUCTS ===
    const groupedProducts = useMemo(() => {
        return products.reduce((acc, p) => {
            const c = p.category ? p.category.name : "Khác";
            if (!acc[c]) acc[c] = [];
            acc[c].push(p);
            return acc;
        }, {});
    }, [products]);

    // === INIT DATA ===
    useEffect(() => {
        const savedCart = localStorage.getItem(`pos_backup_cart_${channelId}`);
        if (savedCart) {
            const parsed = JSON.parse(savedCart);
            updateCart(parsed);
        }

        const fetchData = async () => {
            try {
                const [p, t, s, d] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/products`),
                    axios.get(`${API_BASE_URL}/api/toppings`),
                    axios.get(`${API_BASE_URL}/api/sizes`),
                    axios.get(`${API_BASE_URL}/api/discounts`)
                ]);
                setProducts(p.data.filter(i => i.active));
                setToppingsList(t.data.filter(i => i.active));
                setSizesList(s.data);
                setDiscountsList(d.data.filter(i => i.active));
            } catch (e) {
                console.error("Lỗi tải dữ liệu:", e);
            }
        };
        fetchData();

        const socket = new SockJS(`${API_BASE_URL}/ws`);
        const client = Stomp.over(socket);

        client.connect({}, () => {
            setStompClient(client);

            client.subscribe(`/topic/cart/${channelId}`, (message) => {
                if (message.body) {
                    const serverCart = JSON.parse(message.body);
                    const localSource = cartRef.current.length > 0
                        ? cartRef.current
                        : JSON.parse(localStorage.getItem(`pos_backup_cart_${channelId}`) || "[]");

                    const recoveryPool = [...localSource];
                    const mergedCart = serverCart.map(serverItem => {
                        const sToppings = (serverItem.toppingIds || []).map(Number).sort((a, b) => a - b);
                        const matchIndex = recoveryPool.findIndex(localItem => {
                            const lToppings = (localItem.toppingIds || []).map(Number).sort((a, b) => a - b);
                            return String(localItem.productId) === String(serverItem.id) &&
                                JSON.stringify(sToppings) === JSON.stringify(lToppings);
                        });
                        if (matchIndex !== -1) {
                            const match = recoveryPool[matchIndex];
                            recoveryPool.splice(matchIndex, 1);
                            return { ...serverItem, sizeId: serverItem.sizeId || match.sizeId, size: serverItem.size || match.size, note: serverItem.note || match.note, productId: serverItem.id };
                        }
                        return { ...serverItem, productId: serverItem.id };
                    });
                    updateCart(mergedCart);
                    if (mergedCart.length === 0) {
                        setAppliedDiscount(null);
                        setSyncedUsePoints(false);
                        setSyncedPointsUsed(0);
                        setSyncedPointsDiscount(0);
                    }
                }
            });

            client.subscribe(`/topic/payment-sync/${channelId}`, (message) => {
                if (message.body) {
                    const cmd = JSON.parse(message.body);
                    switch (cmd.action) {
                        case 'SYNC_DISCOUNT': setAppliedDiscount(cmd.discount); break;
                        case 'SHOW_SUMMARY': setPaymentState(prev => ({ ...prev, status: 'SHOW_SUMMARY', tableInfo: cmd.tableNumber })); break;
                        case 'SHOW_QR': setPaymentState({ status: 'SHOW_QR', transactionCode: cmd.code, vnpayLink: '', message: '', tableInfo: cmd.tableNumber }); break;
                        case 'SHOW_VNPAY_BTN': setPaymentState({ status: 'SHOW_VNPAY_BTN', transactionCode: '', vnpayLink: cmd.code, message: '' }); break;
                        case 'WAIT_VNPAY': setPaymentState({ status: 'WAIT_VNPAY', transactionCode: '', vnpayLink: '', message: '' }); break;
                        case 'SUCCESS':
                            setPaymentState({ status: 'SUCCESS_ANIM', message: 'Thanh toán thành công!', transactionCode: '', vnpayLink: '' });
                            updateCart([]);
                            setAppliedDiscount(null);
                            setSyncedUsePoints(false);
                            setSyncedPointsUsed(0);
                            setSyncedPointsDiscount(0);

                            // Đóng modal sau 2s
                            setTimeout(() => {
                                setPaymentState(prev => prev.status === 'SUCCESS_ANIM' ? { status: 'NONE', message: '', transactionCode: '', vnpayLink: '' } : prev);
                            }, 2000);
                            break;
                        case 'SYNC_POINTS':
                            setSyncedUsePoints(cmd.usePoints);
                            setSyncedPointsUsed(cmd.pointsUsed);
                            setSyncedPointsDiscount(cmd.pointsDiscount);
                            setCustomerPhone(cmd.customerPhone || "");
                            break;
                        default: break;
                    }
                }
            });

            // GỌI HÀM XỬ LÝ KẾT QUẢ VNPAY KHI TRANG LOAD LẠI
            handleVNPayProcess(client);

        }, err => console.error(err));

        return () => { if (client.connected) client.disconnect(); };
    }, [channelId, updateCart]);

    // === HÀM XỬ LÝ KẾT QUẢ VNPAY SAU KHI REDIRECT ===
    const handleVNPayProcess = async (client) => {
        const vnpResponseCode = searchParams.get('vnp_ResponseCode');

        // Nếu không có mã phản hồi hoặc đang xử lý -> Dừng
        if (!vnpResponseCode || isProcessingRef.current) return;

        isProcessingRef.current = true;
        setPaymentState({ status: 'WAITING', message: 'Đang xác thực thanh toán...' });

        // Gọi Service xử lý (Giả định VNPayService đã được import)
        const result = await VNPayService.processPaymentResponse(searchParams, channelId);

        if (result.status === 'SUCCESS') {
            // Gửi tín hiệu thành công lên Socket để Staff biết
            client.send(`/topic/payment-sync/${channelId}`, {}, JSON.stringify({
                action: 'PAYMENT_SUCCESS_CLIENT',
                transactionCode: result.transactionCode,
                bankTransNo: result.bankTransNo,
                tableNumber: channelId === 'counter' ? null : channelId
            }));

            // Hiển thị animation thành công
            setPaymentState({ status: 'SUCCESS_ANIM', message: 'Thanh toán thành công!', transactionCode: '', vnpayLink: '' });
            updateCart([]);

            // Đóng modal sau 2s
            setTimeout(() => {
                setPaymentState(prev => prev.status === 'SUCCESS_ANIM' ? { status: 'NONE', message: '', transactionCode: '', vnpayLink: '' } : prev);
            }, 2000);

        } else if (result.status === 'FAILED') {
            setPaymentState({ status: 'FAILED', message: result.message, transactionCode: '', vnpayLink: '' });
        }

        // Xóa params trên URL để tránh xử lý lại khi F5
        if (result.status !== 'NO_PAYMENT') {
            navigate(window.location.pathname + `?table=${channelId}`, { replace: true });
        }

        setTimeout(() => { isProcessingRef.current = false; }, 2000);
    };

    // === TÍCH ĐIỂM: Tìm kiếm gợi ý ===
    const fetchCustomerSuggestions = useCallback(async (phonePrefix) => {
        if (phonePrefix.length < 3) {
            setSuggestedCustomers([]);
            setShowSuggestions(false);
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URL}/api/customers/search?phone=${phonePrefix}`);
            setSuggestedCustomers(res.data.slice(0, 5));
            setShowSuggestions(true);
        } catch (err) {
            console.error("Lỗi tìm kiếm khách hàng:", err);
        }
    }, []);

    useEffect(() => {
        if (customerPhone) {
            fetchCustomerSuggestions(customerPhone);
        } else {
            setSuggestedCustomers([]);
            setShowSuggestions(false);
            setCustomerPoints(0);
        }
    }, [customerPhone, fetchCustomerSuggestions]);

    const selectCustomer = useCallback((cust) => {
        setCustomerPhone(cust.phoneNumber);
        setCustomerName(cust.name || "");
        setCustomerPoints(cust.points || 0);
        setShowSuggestions(false);
    }, []);

    // === HÀM XỬ LÝ SỰ KIỆN ===
    const handleProductClick = useCallback((p) => {
        if (paymentState.status !== 'NONE' && paymentState.status !== 'FAILED' && paymentState.status !== 'SUCCESS_ANIM') return;
        setSelectedProduct(p);
        setOrderQuantity(1);
        setOrderNote("");
        setSelectedToppings([]);
        setSelectedSize(sizesList[0] || null);
        setIsModalOpen(true);
    }, [paymentState.status, sizesList]);

    const confirmAddToCart = useCallback(() => {
        if (!selectedProduct) return;
        const pricing = getProductPricing(selectedProduct);
        const toppingsPrice = toppingsList.filter(t => selectedToppings.includes(t.id)).reduce((sum, t) => sum + t.price, 0);
        const unitPrice = pricing.finalPrice + (selectedSize?.extraPrice || 0) + toppingsPrice;

        const currentCart = [...cartRef.current];
        const toppingNames = toppingsList.filter(t => selectedToppings.includes(t.id)).map(t => t.name).join(', ');

        const newItem = {
            id: selectedProduct.id,
            productId: selectedProduct.id,
            name: selectedProduct.name,
            image: selectedProduct.image,
            size: selectedSize?.name,
            sizeId: selectedSize?.id,
            toppingIds: selectedToppings,
            toppingNames: toppingNames,
            price: unitPrice,
            quantity: orderQuantity,
            note: orderNote,
            displayName: `${selectedProduct.name} ${selectedSize?.name ? `(${selectedSize.name})` : ''}`
        };

        const existIndex = currentCart.findIndex(i =>
            String(i.productId) === String(newItem.productId) &&
            String(i.sizeId) === String(newItem.sizeId) &&
            JSON.stringify(i.toppingIds.sort((a, b) => a - b)) === JSON.stringify(newItem.toppingIds.sort((a, b) => a - b)) &&
            i.note === newItem.note
        );

        if (existIndex > -1) {
            currentCart[existIndex].quantity += orderQuantity;
        } else {
            currentCart.push(newItem);
        }

        updateCart(currentCart);
        setIsModalOpen(false);
    }, [selectedProduct, selectedSize, selectedToppings, toppingsList, orderQuantity, orderNote, getProductPricing, updateCart]);

    const updateQuantity = useCallback((i, delta) => {
        const c = [...cart];
        c[i].quantity += delta;
        if (c[i].quantity <= 0) c.splice(i, 1);
        updateCart(c);
    }, [cart, updateCart]);

    const removeFromCart = useCallback((i) => {
        const c = [...cart];
        c.splice(i, 1);
        updateCart(c);
    }, [cart, updateCart]);

    const roundToThousand = useCallback((value) => {
        if (!value) return 0;
        return Math.round(value / 1000) * 1000;
    }, []);

    return (
        <div className="order-container1">
            <style>{animationStyles}</style>
            <style>{`.loader {border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 20px; height: 20px; animation: spin 2s linear infinite; display:inline-block; vertical-align:middle; margin-right:5px} .sale-badge { position: absolute; top: 10px; right: 10px; background-color: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 800; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2); animation: popIn 0.3s ease; }`}</style>

            {/* === MENU === */}
            <div className="menu-section1">
                <div className="menu-header1">
                    <span>MENU {channelId === 'counter' ? 'TẠI QUẦY' : `BÀN ${channelId}`}</span>
                </div>

                {Object.keys(groupedProducts).map(cat => (
                    <div key={cat} style={{ marginBottom: 40 }}>
                        <h3 className="category-title">{cat}</h3>
                        <div className="menu-grid1">
                            {groupedProducts[cat].map(p => {
                                const pricing = getProductPricing(p);
                                return (
                                    <div
                                        key={p.id}
                                        className="product-card1"
                                        style={{ position: 'relative', overflow: 'hidden' }}
                                        onClick={() => handleProductClick(p)}
                                    >
                                        <div className="card-img-wrapper1">
                                            {pricing.hasDiscount && <div className="sale-badge">SALE -{(pricing.discountPercent * 100).toFixed(0)}%</div>}
                                            <img src={p.image || 'https://placehold.co/150'} onError={(e) => e.target.src = 'https://placehold.co/150'} alt="" />
                                        </div>
                                        <div className="card-info1">
                                            <h3 className="card-name1">{p.name}</h3>
                                            <div className="card-footer1">
                                                {pricing.hasDiscount ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ textDecoration: 'line-through', color: '#999', fontSize: 13 }}>
                                                            {roundToThousand(pricing.originalPrice).toLocaleString()} đ
                                                        </span>
                                                        <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }}>
                                                            {roundToThousand(pricing.finalPrice).toLocaleString()} đ
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="card-price1">
                                                        {roundToThousand(pricing.finalPrice).toLocaleString()} đ
                                                    </div>
                                                )}
                                                <button className="btn-add1">+</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* === GIỎ HÀNG === */}
            <div className="cart-section1">
                <div className="cart-header1">GIỎ HÀNG</div>
                <div className="cart-list1">
                    {cart.map((item, i) => {
                        let displaySize = item.size;
                        if (!displaySize && item.sizeId) {
                            const found = sizesList.find(s => String(s.id) === String(item.sizeId));
                            if (found) displaySize = found.name;
                        }

                        let displayToppings = item.toppingNames;
                        if (!displayToppings && item.toppingIds?.length > 0) {
                            displayToppings = item.toppingIds.map(id => {
                                const t = toppingsList.find(t => String(t.id) === String(id));
                                return t ? `+ ${t.name}` : null;
                            }).filter(Boolean).join(', ');
                        }

                        return (
                            <div key={i} className="cart-item1">
                                <div className="cart-item-top">
                                    <div className="cart-thumb-wrapper">
                                        <img src={item.image || 'https://placehold.co/50'} onError={e => e.target.src = 'https://placehold.co/50'} alt="" />
                                    </div>
                                    <div className="cart-item-info">
                                        <div className="cart-item-name">{item.name}</div>
                                        {displaySize && <div className="cart-item-details" style={{ color: 'gray', fontSize: 12 }}>Size: {displaySize}</div>}
                                        {displayToppings && <div className="cart-item-details" style={{ color: 'gray', fontSize: 12, marginBottom: 5 }}>{displayToppings}</div>}
                                        <div className="cart-item-price">{roundToThousand(item.price).toLocaleString()} đ</div>
                                    </div>
                                    <div className="cart-qty-control">
                                        <button onClick={() => updateQuantity(i, -1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(i, 1)}>+</button>
                                    </div>
                                    <button className="btn-remove-cart" onClick={() => removeFromCart(i)}>×</button>
                                </div>
                                {item.note && <div className="cart-note">Ghi chú: {item.note}</div>}
                            </div>
                        );
                    })}
                </div>

                <div className="cart-footer1">
                    <div className="price-info">
                        <div className="price-row"><span>Tạm tính:</span><span>{roundToThousand(subTotal).toLocaleString()} đ</span></div>
                        {appliedDiscount && <div className="price-row" style={{ color: '#27ae60' }}><span>Giảm mã:</span><span>- {roundToThousand(discountAmount).toLocaleString()} đ</span></div>}

                        {/* HIỂN THỊ ĐIỂM TRỪ NẾU ĐƯỢC SYNC TỪ STAFF */}
                        {syncedUsePoints && displayPointsDiscount > 0 && (
                            <div className="price-row" style={{ color: '#d35400' }}>
                                <span>Tiêu điểm ({displayPointsUsed.toLocaleString()} điểm):</span>
                                <span>- {displayPointsDiscount.toLocaleString()} ₫</span>
                            </div>
                        )}

                        <div className="price-row total"><span>Tổng thanh toán:</span><span>{roundToThousand(finalTotal).toLocaleString('vi-VN')} ₫</span></div>
                    </div>
                </div>
            </div>

            {/* === MODAL CHỌN SẢN PHẨM === */}
            {isModalOpen && selectedProduct && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedProduct.name}</h3>
                            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {sizesList.length > 0 && (
                                <>
                                    <div className="modal-section-title">Chọn Size:</div>
                                    <div className="size-grid">
                                        {sizesList.map(s => (
                                            <div
                                                key={s.id}
                                                onClick={() => setSelectedSize(s)}
                                                style={{
                                                    flex: 1,
                                                    padding: 10,
                                                    border: selectedSize?.id === s.id ? '2px solid var(--color-olive-dark)' : '1px solid #ddd',
                                                    background: selectedSize?.id === s.id ? 'var(--color-sage-light)' : '#fff',
                                                    cursor: 'pointer',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <div>{s.name}</div>
                                                <div style={{ fontSize: 12 }}>{s.extraPrice > 0 ? `+${s.extraPrice.toLocaleString()}` : '+0'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="qty-control-group">
                                <button className="btn-qty-modal" onClick={() => setOrderQuantity(q => Math.max(1, q - 1))}>-</button>
                                <span>{orderQuantity}</span>
                                <button className="btn-qty-modal" onClick={() => setOrderQuantity(q => q + 1)}>+</button>
                            </div>

                            {toppingsList.length > 0 && (
                                <>
                                    <div className="modal-section-title">Topping:</div>
                                    <div className="topping-grid">
                                        {toppingsList.map(t => (
                                            <div
                                                key={t.id}
                                                className="topping-item"
                                                onClick={() => setSelectedToppings(p =>
                                                    p.includes(t.id) ? p.filter(id => id !== t.id) : [...p, t.id]
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedToppings.includes(t.id)}
                                                    readOnly
                                                    style={{ marginRight: 10 }}
                                                />
                                                {t.name} (+{t.price.toLocaleString()}đ)
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="modal-section-title" style={{ marginTop: 15 }}>Ghi chú:</div>
                            <textarea
                                className="modal-textarea"
                                value={orderNote}
                                onChange={e => setOrderNote(e.target.value)}
                                placeholder="Ghi chú cho món này..."
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-modal-primary" onClick={confirmAddToCart}>
                                Thêm - {calculateModalTotal().toLocaleString()} đ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === MODAL THANH TOÁN VNPAY === */}
            {paymentState.status !== 'NONE' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold', color: '#e74c3c' }}>
                            Thanh Toán VNPAY
                        </div>

                        {paymentState.status === 'SHOW_VNPAY_BTN' && paymentState.vnpayLink && (
                            <div style={{ margin: '20px 0', textAlign: 'center' }}>
                                <a
                                    href={paymentState.vnpayLink}
                                    style={{
                                        display: 'inline-block',
                                        padding: '15px 30px',
                                        background: '#005baa',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: 8,
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Thanh toán ngay ({roundToThousand(finalTotal).toLocaleString('vi-VN')} ₫)
                                </a>
                            </div>
                        )}

                        {paymentState.status === 'WAITING' &&
                            <div style={{ textAlign: 'center', padding: 20 }}>
                                <div className="loader-spinner"></div>
                                <div>Đang xử lý thanh toán...</div>
                            </div>
                        }

                        {paymentState.status === 'SUCCESS_ANIM' &&
                            <div className="anim-success" style={{ textAlign: 'center', padding: 20 }}>
                                <span className="status-icon success-icon">✅</span>
                                <h3 style={{ color: '#27ae60' }}>Thanh toán thành công!</h3>
                                <p>Cảm ơn quý khách.</p>
                            </div>
                        }

                        {paymentState.status === 'FAILED' &&
                            <div className="anim-error" style={{ textAlign: 'center', padding: 20 }}>
                                <span className="status-icon error-icon">❌</span>
                                <h3 style={{ color: '#e74c3c' }}>Thanh toán thất bại</h3>
                                <p>{paymentState.message}</p>
                                <button onClick={() => setPaymentState({ status: 'NONE', message: '' })} style={{ marginTop: 15, padding: '8px 16px', border: 'none', background: '#e74c3c', color: 'white', borderRadius: 4, cursor: 'pointer' }}>Đóng</button>
                            </div>
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerOrder;