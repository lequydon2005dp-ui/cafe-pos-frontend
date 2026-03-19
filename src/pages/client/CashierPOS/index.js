import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';

// !!! IMPORT HEADER MỚI !!!
// (Hãy điều chỉnh đường dẫn import tùy theo nơi bạn lưu file StaffHeader.jsx)
import StaffHeader from '../../../components/staff/StaffHeader';

const API_BASE_URL = 'http://172.20.10.2:8080';

// ====================== CSS (ĐÃ XÓA PHẦN HEADER) ======================
const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@600;700&display=swap');
    :root { 
        --color-cream: #F9F8F6; --color-sage-light: #EFE9E3; --color-sage-med: #D9CFC7; 
        --color-olive-dark: #C9B59C; --color-white: #ffffff; --color-text-main: #2c3e2e; 
        --color-danger: #e74c3c; --color-success: #27ae60; 
        --shadow-soft: 0 8px 24px rgba(119, 136, 115, 0.15); 
        --nav-height: 60px;
    }
    
    * { box-sizing: border-box; outline: none; } 
    
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--color-olive-dark); }

    .cashier-layout { 
        display: flex; 
        flex-direction: column; 
        height: 100vh; 
        width: 100vw;
        margin: 0; 
        font-family: 'DM Sans', sans-serif; 
        background-color: var(--color-cream); 
        color: var(--color-text-main); 
        font-size: 14px; 
        overflow: hidden; 
        position: fixed; 
        top: 0; left: 0; right: 0; bottom: 0;
    }

    /* ĐÃ XÓA CSS .top-nav VÀ CÁC CLASS LIÊN QUAN VÌ ĐÃ CHUYỂN SANG STAFFHEADER */

    .order-container1 { 
        display: flex; 
        flex-direction: row; 
        flex: 1; 
        height: calc(100vh - var(--nav-height)); 
        overflow: hidden; 
        background-color: var(--color-cream); 
    }

    .menu-section1 { 
        flex: 1; 
        padding: 20px; 
        overflow-y: auto; 
        height: 100%;
        min-width: 0; 
    } 

    .menu-header1 { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; } 
    .menu-header1 span { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--color-olive-dark); border-bottom: 3px solid var(--color-sage-med); } 
    .channel-select { padding: 8px 15px; border: 1px solid var(--color-sage-med); border-radius: 8px; cursor: pointer; background: white; }

    .category-title { 
        font-family: 'Playfair Display'; 
        color: var(--color-olive-dark); 
        font-size: 1.4rem; 
        margin-bottom: 15px; 
        padding: 8px 15px; 
        border-left: 4px solid var(--color-olive-dark); 
        background: rgba(201, 181, 156, 0.1); 
        border-radius: 0 10px 10px 0; 
        width: fit-content; 
    } 

    .menu-grid1 { 
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); 
        gap: 20px; 
        padding-bottom: 40px; 
    }

    .product-card1 { 
        background: #fff; 
        border-radius: 12px; 
        border: 1px solid rgba(161, 188, 152, 0.3); 
        box-shadow: 0 2px 5px rgba(0,0,0,0.02); 
        cursor: pointer; 
        overflow: hidden; 
        display: flex; 
        flex-direction: column; 
        transition: 0.2s; 
    } 
    .product-card1:hover { transform: translateY(-5px); box-shadow: var(--shadow-soft); border-color: var(--color-sage-med); } 
    
    .card-img-wrapper1 { 
        height: 140px; 
        width: 100%; 
        overflow: hidden; 
        position: relative; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
        background: #f9f9f9; 
    } 
    .card-img-wrapper1 img { width: 80%; height: 100%; object-fit: cover; } 
    
    .card-info1 { padding: 12px; display: flex; flex-direction: column; flex: 1; } 
    .card-name1 { font-size: 1rem; font-weight: 700; margin: 0 0 8px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } 
    .card-footer1 { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; } 
    
    .btn-add1 { 
        width: 30px; height: 30px; 
        border-radius: 50%; background: var(--color-cream); 
        color: var(--color-olive-dark); border: none; font-size: 20px; 
        display: flex; justify-content: center; align-items: center; 
        flex-shrink: 0;
    } 
    .product-card1:hover .btn-add1 { background: var(--color-olive-dark); color: #fff; }
    .sale-badge { position: absolute; top: 10px; right: 10px; background-color: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800; z-index: 10; }
    
    .price-container { display: flex; flex-direction: column; align-items: flex-start; }
    .card-price-original { text-decoration: line-through; color: #95a5a6; font-size: 0.8rem; margin-right: 5px; }
    .card-price-final { color: #e74c3c; font-weight: 700; font-size: 1rem; }
    .card-price-normal { color: var(--color-olive-dark); font-weight: 600; font-size: 1rem; }

    .cart-section1 { 
        width: 400px; 
        background: #fff; 
        border-left: 1px solid #e0e0e0;
        box-shadow: -5px 0 20px rgba(0,0,0,0.05); 
        display: flex; 
        flex-direction: column; 
        z-index: 100; 
        height: 100%; 
        flex-shrink: 0; 
    } 

    .cart-header1 { 
        padding: 20px; 
        background: #fafafa;
        border-bottom: 1px dashed var(--color-sage-med); 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
    } 
    .cart-header1 span:first-child { font-family: 'Playfair Display'; font-size: 1.4rem; font-weight: bold; color: var(--color-olive-dark); }
    .cart-count-badge { background: var(--color-olive-dark); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }

    .cart-list1 { flex: 1; padding: 15px; overflow-y: auto; background: #fff; } 
    .cart-item1 { display: flex; flex-direction: column; margin-bottom: 12px; padding: 10px; border: 1px solid #eee; border-radius: 10px; background: #fff; position: relative; } 
    .cart-item-top { display: flex; gap: 10px; align-items: flex-start; }
    .cart-thumb-wrapper { width: 50px; height: 50px; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1px solid #eee; }
    .cart-thumb-wrapper img { width: 100%; height: 100%; object-fit: cover; }
    
    .cart-item-info { flex: 1; display: flex; flex-direction: column; }
    .cart-item-name { font-size: 0.95rem; font-weight: 700; color: var(--color-text-main); line-height: 1.2; margin-bottom: 4px; }
    .cart-item-details { font-size: 0.8rem; color: #666; font-style: italic; white-space: pre-line;}
    .cart-item-price { font-size: 0.9rem; font-weight: 700; color: var(--color-olive-dark); margin-top: 5px; }
    
    .cart-qty-control { display: flex; align-items: center; background: var(--color-cream); border-radius: 6px; padding: 2px; margin-top: 5px; width: fit-content; align-self: flex-end; } 
    .cart-qty-control button { width: 24px; height: 24px; border-radius: 5px; border: none; background: #fff; cursor: pointer; font-weight: bold; } 
    .cart-qty-control span { margin: 0 8px; font-size: 0.9rem; font-weight: 700; } 
    
    .btn-remove-cart { position: absolute; top: 5px; right: 5px; background: none; border: none; color: #ccc; font-size: 18px; cursor: pointer; padding: 5px; }
    .btn-remove-cart:hover { color: var(--color-danger); }
    .cart-note { color: var(--color-danger); font-style: italic; font-size: 0.8rem; margin-top: 4px; padding-left: 60px; }

    .cart-footer1 { 
        padding: 20px; 
        border-top: 1px solid #eee; 
        background: #fff; 
        box-shadow: 0 -5px 20px rgba(0,0,0,0.03);
    }
    
    .discount-section { margin-bottom: 15px; }
    .discount-input-group { display: flex; gap: 10px; margin-bottom: 10px; }
    .input-code { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; text-transform: uppercase; font-weight: bold; color: var(--color-olive-dark); outline: none; transition: 0.2s; }
    .input-code:focus { border-color: var(--color-olive-dark); }
    .btn-apply { background: var(--color-olive-dark); color: white; border: none; padding: 0 20px; border-radius: 8px; cursor: pointer; font-weight: 700; white-space: nowrap; }
    
    .discount-tag { background: #d1e7dd; color: #0f5132; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #badbcc; font-weight: 600; }
    .btn-remove-code { background: none; border: none; color: #0f5132; font-weight: bold; cursor: pointer; font-size: 1.1rem; }

    .price-info { margin-bottom: 15px; }
    .price-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem; font-weight: 500; color: #555; }
    .price-row.total { font-size: 1.4rem; font-weight: 800; color: #e74c3c; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd; }
    
    .btn-checkout1 { 
        width: 100%; padding: 16px; 
        background: var(--color-olive-dark); color: white; 
        border: none; border-radius: 12px; 
        font-size: 1.1rem; font-weight: 700; 
        cursor: pointer; 
        transition: 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .btn-checkout1:hover { background: #b09b82; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(176, 155, 130, 0.4); }
    .btn-checkout1:disabled { background: #e0e0e0; color: #999; cursor: not-allowed; transform: none; box-shadow: none; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(2px); animation: fadeIn 0.2s; }
    .modal-content { background: #fff; width: 95%; max-width: 550px; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; animation: slideUp 0.3s; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    .modal-header { padding: 15px 20px; background: var(--color-cream); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
    .modal-header h3 { margin: 0; font-family: 'Playfair Display'; color: var(--color-text-main); font-size: 1.3rem; }
    .btn-close-modal { border: none; background: none; font-size: 24px; cursor: pointer; color: #888; }
    
    .modal-body { padding: 20px; overflow-y: auto; min-height: 300px; }
    .modal-section-title { font-weight: 700; margin-bottom: 10px; font-size: 0.95rem; color: #444; }
    
    .size-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
    .size-item { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; text-align: center; cursor: pointer; min-width: 80px; transition: 0.2s; }
    .size-item.active { background: var(--color-sage-light); border-color: var(--color-olive-dark); color: var(--color-olive-dark); font-weight: bold; }
    
    .topping-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
    .topping-item { display: flex; align-items: center; padding: 10px; border: 1px solid #eee; border-radius: 8px; cursor: pointer; transition: 0.2s; }
    .topping-item:hover { background: #f9f9f9; }
    .topping-item.active { background: var(--color-cream); border-color: var(--color-olive-dark); font-weight: 500; }
    
    .qty-control-group { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; gap: 15px; }
    .btn-qty-modal { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #ddd; background: white; font-size: 18px; cursor: pointer; }
    .btn-qty-modal:hover { border-color: var(--color-olive-dark); color: var(--color-olive-dark); }
    
    .modal-textarea { width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 12px; min-height: 80px; font-family: inherit; resize: vertical; outline: none; }
    .modal-textarea:focus { border-color: var(--color-olive-dark); }
    
    .modal-footer { padding: 20px; border-top: 1px solid #eee; display: flex; gap: 15px; background: #fff; }
    .btn-modal-secondary { padding: 12px 25px; background: #f0f0f0; color: #333; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-modal-primary { flex: 1; padding: 12px; background: var(--color-olive-dark); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; }
    
    .payment-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .payment-tab { flex: 1; padding: 12px; text-align: center; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; background: #fff; font-weight: 600; transition: 0.2s; }
    .payment-tab.active { background: #f4fcf6; border-color: var(--color-olive-dark); color: var(--color-olive-dark); box-shadow: inset 0 0 0 1px var(--color-olive-dark); }
    
    .cash-input-group { background: #f9f9f9; padding: 15px; border-radius: 10px; }
    .cash-input-row { display: flex; justify-content: space-between; align-items: center; font-size: 1rem; margin-bottom: 10px; }
    .cash-input { padding: 10px; border: 1px solid #ccc; border-radius: 6px; width: 150px; text-align: right; font-weight: bold; font-size: 1.1rem; }
    .cash-change-display { font-weight: 800; color: var(--color-success); font-size: 1.2rem; }
    
    .btn-confirm-payment { width: 100%; padding: 15px; background: var(--color-success); color: white; border: none; border-radius: 10px; font-size: 1.1rem; font-weight: 700; cursor: pointer; margin-top: 10px; }
    .btn-confirm-payment:disabled { background: #ccc; cursor: not-allowed; }
    .btn-vnpay { background: #005ba3; }
    
    .order-summary-box { max-height: 150px; overflow-y: auto; background: #fff; border: 1px solid #eee; padding: 10px; border-radius: 8px; margin-bottom: 20px; text-align: left; }
    .summary-item { border-bottom: 1px solid #f5f5f5; padding-bottom: 8px; margin-bottom: 8px; font-size: 0.9rem; }

    /* === STYLE TÍCH ĐIỂM (NEW UI - CARD STYLE) === */
    .points-section { 
        margin: 20px 0; 
        padding: 0; 
        background: #fff; 
        border-radius: 12px; 
        border: 1px solid #e0e0e0; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.03); 
        overflow: visible;
    }

    .loyalty-header {
        background: #f8f9fa;
        padding: 12px 15px;
        border-bottom: 1px solid #eee;
        font-weight: 700;
        color: #333;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.95rem;
    }
    .loyalty-icon { font-size: 1.1rem; }

    .loyalty-body { padding: 15px; position: relative; }

    .input-wrapper { position: relative; width: 100%; }
    .phone-input { 
        width: 100%; 
        padding: 12px; 
        border: 1px solid #ddd; 
        border-radius: 8px; 
        font-size: 1rem; 
        transition: 0.2s;
    }
    .phone-input:focus { border-color: #27ae60; box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.1); }

    .suggestions-dropdown { 
        position: absolute; top: 100%; left: 0; width: 100%;
        background: white; border: 1px solid #eee; 
        border-radius: 8px; margin-top: 5px;
        max-height: 200px; overflow-y: auto; 
        z-index: 2000; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .suggestion-item { padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #f5f5f5; display: flex; justify-content: space-between; }
    .suggestion-item:hover { background: #f0fdf4; }

    .customer-card-info { display: flex; flex-direction: column; gap: 5px; }

    .customer-row-top { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        margin-bottom: 5px;
    }
    .customer-name-display { font-size: 1.1rem; font-weight: 800; color: #2c3e50; }
    .btn-change-customer { 
        font-size: 0.85rem; 
        color: #e74c3c; 
        cursor: pointer; 
        background: none; 
        border: none; 
        font-weight: 600; 
    }
    .btn-change-customer:hover { text-decoration: underline; }

    .points-row-display { 
        display: flex; 
        align-items: center; 
        gap: 8px; 
        color: #f39c12; 
        font-weight: 700; 
        font-size: 0.95rem; 
    }
    .diamond-icon { font-size: 1.1rem; }

    .divider-line { height: 1px; background: #eee; margin: 12px 0; }

    .toggle-row { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
    }
    .toggle-label { font-size: 0.95rem; color: #555; }

    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
        position: absolute; cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 34px;
    }
    .slider:before {
        position: absolute; content: "";
        height: 18px; width: 18px;
        left: 3px; bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    input:checked + .slider { background-color: #27ae60; }
    input:checked + .slider:before { transform: translateX(20px); }

    .points-input-custom {
        width: 100%; padding: 10px; margin-top: 10px;
        border: 1px dashed #27ae60; background: #f0fdf4;
        border-radius: 6px; font-weight: bold; color: #27ae60; text-align: center;
    }

    .payment-summary-mini {
        background: #fff8e1;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px dashed #f39c12;
    }
    .payment-summary-row {
        display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.95rem; color: #555;
    }
    .payment-summary-total {
        border-top: 1px solid #ddd;
        margin-top: 8px;
        padding-top: 8px;
        font-weight: 800;
        font-size: 1.2rem;
        color: #e74c3c;
        display: flex; justify-content: space-between;
    }
`;

const CashierPOS = () => {
    const navigate = useNavigate();

    // STATE
    const [products, setProducts] = useState([]);
    const [toppingsList, setToppingsList] = useState([]);
    const [sizesList, setSizesList] = useState([]);
    const [discountsList, setDiscountsList] = useState([]);
    const [cart, setCart] = useState([]);
    const [currentChannel, setCurrentChannel] = useState("counter");
    const [stompClient, setStompClient] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [inputCode, setInputCode] = useState("");
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [orderNote, setOrderNote] = useState("");
    const [orderQuantity, setOrderQuantity] = useState(1);
    const [selectedToppings, setSelectedToppings] = useState([]);
    const [selectedSize, setSelectedSize] = useState(null);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [transactionCode, setTransactionCode] = useState("");
    const [selectedTableForPayment, setSelectedTableForPayment] = useState("counter");
    const [isVNPayLinkSent, setIsVNPayLinkSent] = useState(false);
    const [customerCash, setCustomerCash] = useState("");
    const [changeAmount, setChangeAmount] = useState(0);

    // STATE TÍCH ĐIỂM
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPoints, setCustomerPoints] = useState(0);
    const [usePoints, setUsePoints] = useState(false);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [suggestedCustomers, setSuggestedCustomers] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isCustomerSelected, setIsCustomerSelected] = useState(false);

    const cartRef = useRef([]);
    const selectedTableRef = useRef("counter");

    const updateCart = (newCart) => {
        setCart(newCart);
        cartRef.current = newCart;
        localStorage.setItem(`pos_backup_cart_${currentChannel}`, JSON.stringify(newCart));
    };

    // Đồng bộ State bàn chọn với Ref để Socket đọc được giá trị mới nhất
    useEffect(() => {
        selectedTableRef.current = selectedTableForPayment;
    }, [selectedTableForPayment]);


    // Dùng Ref để lưu trữ state thanh toán, tránh Stale Closure khi Socket gọi về
    const orderStateRef = useRef({
        usePoints: false,
        pointsToUse: 0,
        customerPhone: "",
        customerName: "",
        appliedDiscount: null,
        finalTotal: 0,
        subTotal: 0,
        discountAmount: 0,
        pointsDiscount: 0
    });

    // TÍNH TOÁN GIÁ
    const subTotal = useMemo(() => cart.reduce((s, i) => s + (i.price * i.quantity), 0), [cart]);
    const discountAmount = useMemo(() => appliedDiscount ? subTotal * appliedDiscount.discountPercentage : 0, [subTotal, appliedDiscount]);
    const pointsDiscount = useMemo(() => {
        if (!usePoints) return 0;
        let discount = Math.min(pointsToUse * 1000, subTotal - discountAmount);
        const remaining = subTotal - discountAmount - discount;
        if (remaining > 0 && remaining < 1000 && customerPoints > pointsToUse) {
            discount += 1000;
            setPointsToUse(prev => prev + 1);
        }
        return discount;
    }, [usePoints, pointsToUse, subTotal, discountAmount, customerPoints]);
    const finalTotal = useMemo(() => Math.max(0, subTotal - discountAmount - pointsDiscount), [subTotal, discountAmount, pointsDiscount]);

    // Update Ref whenever state changes
    useEffect(() => {
        orderStateRef.current = {
            usePoints,
            pointsToUse,
            customerPhone,
            customerName,
            appliedDiscount,
            finalTotal,
            subTotal,
            discountAmount,
            pointsDiscount
        };
    }, [usePoints, pointsToUse, customerPhone, customerName, appliedDiscount, finalTotal, subTotal, discountAmount, pointsDiscount]);

    // === SYNC POINTS TO CLIENT ===
    useEffect(() => {
        if (stompClient?.connected && isPaymentModalOpen) {
            stompClient.send(`/topic/payment-sync/${currentChannel}`, {}, JSON.stringify({
                action: 'SYNC_POINTS',
                usePoints: usePoints,
                pointsUsed: pointsToUse,
                pointsDiscount: pointsDiscount,
                customerPhone: customerPhone,
                customerName: customerName
            }));
        }
    }, [usePoints, pointsToUse, pointsDiscount, customerPhone, customerName, stompClient, currentChannel, isPaymentModalOpen]);


    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('clientToken');
        return token ? { headers: { Authorization: `Bearer ${token}` } } : null;
    }, []);

    useEffect(() => {
        const savedCart = localStorage.getItem(`pos_backup_cart_${currentChannel}`);
        if (savedCart) {
            const parsed = JSON.parse(savedCart);
            setCart(parsed);
            cartRef.current = parsed;
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
        client.connect({}, () => setStompClient(client), err => console.error("Socket error:", err));

        return () => {
            if (client && client.connected) {
                client.disconnect();
            }
        };
    }, [currentChannel]);

    useEffect(() => {
        if (!stompClient?.connected) return;

        const cartSub = stompClient.subscribe(`/topic/cart/${currentChannel}`, msg => {
            if (msg.body) {
                const serverCart = JSON.parse(msg.body);
                const localSource = cartRef.current.length > 0
                    ? cartRef.current
                    : JSON.parse(localStorage.getItem(`pos_backup_cart_${currentChannel}`) || "[]");

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
                if (mergedCart.length === 0) setAppliedDiscount(null);
            }
        });

        const paySub = stompClient.subscribe(`/topic/payment-sync/${currentChannel}`, msg => {
            if (msg.body) {
                const cmd = JSON.parse(msg.body);
                if (cmd.action === 'PAYMENT_SUCCESS_CLIENT') {
                    alert("✅ Khách đã thanh toán VNPay thành công!");
                    let actualTable = cmd.tableNumber;

                    // Nếu nhân viên đang chọn 1 bàn cụ thể trong modal thanh toán, ưu tiên bàn đó
                    if (!actualTable && selectedTableRef.current && selectedTableRef.current !== 'counter') {
                        actualTable = selectedTableRef.current;
                    }

                    // Fallback cuối cùng
                    if (!actualTable) {
                        actualTable = currentChannel;
                    }
                    if (cartRef.current.length > 0) {
                        confirmOrderPayment(cartRef.current, actualTable, 'VNPAY', true, cmd.transactionCode);
                    }
                }
            }
        });

        return () => {
            cartSub.unsubscribe();
            paySub.unsubscribe();
        };
    }, [currentChannel, stompClient]);

    const fetchCustomerSuggestions = useCallback(async (phonePrefix) => {
        if (phonePrefix.length < 3) {
            setSuggestedCustomers([]);
            setShowSuggestions(false);
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URL}/api/customers/search?phone=${phonePrefix}`, getAuthHeaders());
            setSuggestedCustomers(res.data.slice(0, 5));
            setShowSuggestions(true);
        } catch (err) {
            console.error("Lỗi tìm kiếm khách hàng:", err);
            setSuggestedCustomers([]);
        }
    }, [getAuthHeaders]);

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
        setIsCustomerSelected(true);
    }, []);

    const confirmOrderPayment = async (cartData, table, method, isSilent = false, vnpCode = null) => {
        if (isProcessing) return;
        const token = localStorage.getItem('clientToken');
        if (!token) { if (!isSilent) alert("Hết phiên!"); navigate('/login'); return; }
        setIsProcessing(true);

        const state = orderStateRef.current;

        try {
            if (state.usePoints && state.pointsToUse > 0 && state.customerPhone) {
                await axios.post(`${API_BASE_URL}/api/customers/deduct-points`, {
                    phone: state.customerPhone,
                    points: state.pointsToUse
                }, { headers: { Authorization: `Bearer ${token}` } });
            }

            const orderData = {
                customerName: state.customerName || (table === 'counter' ? "Khách Lẻ" : `Bàn ${table}`),
                tableNumber: table === 'counter' ? null : table,
                source: method === 'VNPAY' ? 'QR_TABLE' : 'AT_COUNTER',
                items: cartData.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    note: i.note,
                    toppingIds: i.toppingIds || [],
                    sizeId: i.sizeId
                })),
                paymentMethod: method,
                paymentStatus: 'PAID',

                totalAmount: state.finalTotal,
                subTotal: state.subTotal,
                discountAmount: state.discountAmount,
                pointsDiscount: state.pointsDiscount,
                pointsUsed: state.usePoints ? state.pointsToUse : 0,

                transactionCode: vnpCode || transactionCode || `TX-${Date.now()}`,
                note: state.appliedDiscount ? `Voucher: ${state.appliedDiscount.code}` : "",
                customerPhone: state.customerPhone || null
            };

            await axios.post(`${API_BASE_URL}/api/orders`, orderData, { headers: { Authorization: `Bearer ${token}` } });

            if (state.customerPhone && state.finalTotal > 0) {
                const newPoints = Math.floor(state.finalTotal / 1000);
                if (newPoints > 0) {
                    await axios.post(`${API_BASE_URL}/api/customers/add-points`, {
                        phone: state.customerPhone,
                        points: newPoints,
                        name: state.customerName
                    }, { headers: { Authorization: `Bearer ${token}` } });
                }
            }

            if (!isSilent) alert(`Thanh toán thành công!${state.customerPhone ? `\nTích thêm ${Math.floor(state.finalTotal / 1000)} điểm` : ''}`);

            if (stompClient?.connected) {
                stompClient.send(`/topic/payment-sync/${currentChannel}`, {}, JSON.stringify({ action: 'SUCCESS' }));
            }

            updateCart([]);
            cartRef.current = [];
            localStorage.setItem(`pos_backup_cart_${currentChannel}`, JSON.stringify([]));
            setAppliedDiscount(null);
            setCustomerPhone("");
            setCustomerName("");
            setCustomerPoints(0);
            setUsePoints(false);
            setPointsToUse(0);
            setIsCustomerSelected(false);
            setIsPaymentModalOpen(false);
        } catch (e) {
            alert("Lỗi thanh toán hoặc xử lý điểm!");
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApplyDiscount = async () => {
        if (!inputCode.trim()) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/discounts`);
            const found = res.data.find(d => d.code === inputCode.toUpperCase());
            if (!found) { alert("❌ Mã không tồn tại!"); return; }
            if (!found.active) { alert("❌ Mã đã bị vô hiệu hóa!"); return; }
            if (found.expiryDate && new Date(found.expiryDate).getTime() < new Date().getTime()) { alert("❌ Mã đã hết hạn!"); return; }
            setAppliedDiscount(found);
            alert("✅ Áp dụng thành công!");
            setInputCode("");
            if (stompClient?.connected) stompClient.send(`/topic/payment-sync/${currentChannel}`, {}, JSON.stringify({ action: 'SYNC_DISCOUNT', discount: found }));
        } catch (error) { console.error(error); alert("Lỗi kết nối!"); }
    };

    const removeDiscount = () => {
        setAppliedDiscount(null);
        setInputCode("");
        if (stompClient?.connected) stompClient.send(`/topic/payment-sync/${currentChannel}`, {}, JSON.stringify({ action: 'SYNC_DISCOUNT', discount: null }));
    };

    const syncCart = useCallback((newCart) => {
        updateCart(newCart);
        cartRef.current = newCart;
        localStorage.setItem(`pos_backup_cart_${currentChannel}`, JSON.stringify(newCart));
        if (stompClient?.connected) stompClient.send(`/app/cart/sync/${currentChannel}`, {}, JSON.stringify(newCart));
    }, [stompClient, currentChannel]);

    const handleProductClick = (p) => {
        setSelectedProduct(p);
        setOrderQuantity(1);
        setOrderNote("");
        setSelectedToppings([]);
        setSelectedSize(sizesList[0] || null);
        setIsProductModalOpen(true);
    };

    const addToCart = () => {
        if (!selectedProduct) return;
        const pricing = getProductPricing(selectedProduct);
        const toppingsPrice = toppingsList.filter(t => selectedToppings.includes(t.id)).reduce((s, t) => s + t.price, 0);
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
            note: orderNote
        };

        const existIndex = currentCart.findIndex(i =>
            String(i.productId) === String(newItem.productId) &&
            String(i.sizeId) === String(newItem.sizeId) &&
            JSON.stringify(i.toppingIds.sort((a, b) => a - b)) === JSON.stringify(newItem.toppingIds.sort((a, b) => a - b)) &&
            i.note === newItem.note
        );

        if (existIndex > -1) currentCart[existIndex].quantity += orderQuantity;
        else currentCart.push(newItem);

        syncCart(currentCart);
        setIsProductModalOpen(false);
    };

    const updateQuantity = (i, delta) => {
        const c = [...cart];
        c[i].quantity += delta;
        if (c[i].quantity <= 0) c.splice(i, 1);
        syncCart(c);
    };

    const removeFromCart = (i) => {
        const c = [...cart];
        c.splice(i, 1);
        syncCart(c);
    };

    const openPaymentModal = () => {
        setTransactionCode(`GD${new Date().getHours()}${new Date().getMinutes()}${new Date().getSeconds()}`);
        setPaymentMethod(null);
        setSelectedTableForPayment(currentChannel);
        setCustomerCash("");
        setChangeAmount(0);
        setIsVNPayLinkSent(false);
        setUsePoints(false);
        setPointsToUse(0);
        setCustomerPhone("");
        setCustomerName("");
        setCustomerPoints(0);
        setIsCustomerSelected(false);
        setIsPaymentModalOpen(true);
    };

    const handleSelectMethod = (m) => {
        setPaymentMethod(m);
        setIsVNPayLinkSent(false);
        if (m === 'VNPAY') {
            if (stompClient?.connected) stompClient.send(`/topic/payment-sync/${currentChannel}`, {}, JSON.stringify({ action: 'WAIT_VNPAY' }));
        } else if (m !== 'CASH') {
            if (stompClient?.connected) stompClient.send(`/topic/payment-sync/${currentChannel}`, {}, JSON.stringify({ action: 'SHOW_QR', code: transactionCode, tableNumber: selectedTableForPayment }));
        }
    };

    const handleSendVNPay = async () => {
        try {
            localStorage.setItem('pending_payment_table', selectedTableForPayment);
            const res = await axios.get(`${API_BASE_URL}/api/payment/create_payment?amount=${finalTotal}&table=${selectedTableForPayment}`);
            if (res.data.status === 'OK') {
                if (stompClient?.connected) {
                    stompClient.send(`/topic/payment-sync/${currentChannel}`, {}, JSON.stringify({
                        action: 'SHOW_VNPAY_BTN',
                        code: res.data.url,
                        tableNumber: selectedTableForPayment
                    }));
                }
                setIsVNPayLinkSent(true);
            }
        } catch (err) {
            console.error(err);
            alert("Lỗi tạo link VNPay");
        }
    };

    const roundToThousand = (value) => {
        if (!value) return 0;
        return Math.round(value / 1000) * 1000;
    };

    const getProductPricing = useCallback((product) => {
        const validDiscounts = discountsList.filter(d => {
            if (!d.active) return false;
            if (d.expiryDate && new Date(d.expiryDate).getTime() < new Date().getTime()) return false;
            if (d.productIds?.includes(product.id)) return true;
            if (d.products?.some(p => p.id === product.id)) return true;
            return false;
        });
        if (validDiscounts.length === 0) return { hasDiscount: false, finalPrice: product.price, originalPrice: product.price, discountPercent: 0 };
        const bestDiscount = validDiscounts.reduce((prev, curr) => (prev.discountPercentage > curr.discountPercentage) ? prev : curr);
        return { hasDiscount: true, finalPrice: product.price * (1 - bestDiscount.discountPercentage), originalPrice: product.price, discountPercent: bestDiscount.discountPercentage };
    }, [discountsList]);

    return (
        <div className="cashier-layout">
            <style>{styles}</style>

            {/* HEADER MỚI */}
            <StaffHeader />

            <div className="order-container1">
                <div className="menu-section1">
                    <div className="menu-header1">
                        <span>MENU</span>
                    </div>

                    {Object.keys(products.reduce((acc, p) => {
                        const c = p.category ? p.category.name : "Khác";
                        if (!acc[c]) acc[c] = [];
                        acc[c].push(p);
                        return acc;
                    }, {})).map(cat => (
                        <div key={cat}>
                            <h3 className="category-title">{cat}</h3>
                            <div className="menu-grid1">
                                {products.filter(p => (p.category ? p.category.name : "Khác") === cat).map(p => {
                                    const pricing = getProductPricing(p);
                                    return (
                                        <div key={p.id} className="product-card1" onClick={() => handleProductClick(p)}>
                                            <div className="card-img-wrapper1">
                                                {pricing.hasDiscount && <div className="sale-badge">SALE -{pricing.discountPercent * 100}%</div>}
                                                <img src={p.image || 'https://placehold.co/150'} onError={e => e.target.src = 'https://placehold.co/150'} alt="" />
                                            </div>
                                            <div className="card-info1">
                                                <h3 className="card-name1">{p.name}</h3>
                                                <div className="card-footer1">
                                                    <div className="price-container">
                                                        {pricing.hasDiscount ? (
                                                            <>
                                                                <span className="card-price-original">{roundToThousand(pricing.originalPrice).toLocaleString()} đ</span>
                                                                <span className="card-price-final">{roundToThousand(pricing.finalPrice).toLocaleString()} đ</span>
                                                            </>
                                                        ) : (
                                                            <span className="card-price-normal">{roundToThousand(pricing.finalPrice).toLocaleString()} đ</span>
                                                        )}
                                                    </div>
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

                <div className="cart-section1">
                    <div className="cart-header1">
                        <span>Giỏ hàng ({currentChannel === 'counter' ? 'Tại Quầy' : `Bàn ${currentChannel}`})</span>
                        <span className="cart-count-badge">{cart.reduce((a, b) => a + b.quantity, 0)} món</span>
                    </div>

                    <div className="cart-list1">
                        {cart.map((item, i) => {
                            let displaySize = item.size;
                            if ((!displaySize || typeof displaySize === 'object') && item.sizeId) {
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
                                            {displaySize && <div className="cart-item-details">Size: {displaySize}</div>}
                                            {displayToppings && <div className="cart-item-details">{displayToppings}</div>}
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
                        <div className="discount-section">
                            {!appliedDiscount ? (
                                <div className="discount-input-group">
                                    <input className="input-code" placeholder="Mã giảm giá..." value={inputCode} onChange={e => setInputCode(e.target.value)} />
                                    <button className="btn-apply" onClick={handleApplyDiscount}>ÁP DỤNG</button>
                                </div>
                            ) : (
                                <div className="discount-tag">
                                    🏷️ {appliedDiscount.code} (-{(appliedDiscount.discountPercentage * 100)}%)
                                    <button className="btn-remove-code" onClick={removeDiscount}>✕</button>
                                </div>
                            )}
                        </div>

                        <div className="price-info">
                            <div className="price-row"><span>Tạm tính:</span><span>{roundToThousand(subTotal).toLocaleString()} đ</span></div>
                            {appliedDiscount && <div className="price-row" style={{ color: '#27ae60' }}><span>Giảm giá:</span><span>- {roundToThousand(discountAmount).toLocaleString()} đ</span></div>}
                            {usePoints && pointsDiscount > 0 && <div className="price-row" style={{ color: '#27ae60' }}><span>Giảm bằng điểm ({pointsToUse} điểm):</span><span>- {pointsDiscount.toLocaleString()} đ</span></div>}
                            <div className="price-row total"><span>Tổng cộng:</span><span>{roundToThousand(finalTotal).toLocaleString()} đ</span></div>
                        </div>

                        <button className="btn-checkout1" onClick={openPaymentModal} disabled={cart.length === 0}>
                            THANH TOÁN
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL CHỌN SẢN PHẨM */}
            {isProductModalOpen && selectedProduct && (
                <div className="modal-overlay" onClick={() => setIsProductModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedProduct.name}</h3>
                            <button className="btn-close-modal" onClick={() => setIsProductModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {sizesList.length > 0 && (
                                <>
                                    <div className="modal-section-title">Chọn Size:</div>
                                    <div className="size-grid">
                                        {sizesList.map(s => (
                                            <div
                                                key={s.id}
                                                className={`size-item ${selectedSize?.id === s.id ? 'active' : ''}`}
                                                onClick={() => setSelectedSize(s)}
                                            >
                                                {s.name} <br />
                                                <small>+{s.extraPrice.toLocaleString()}đ</small>
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
                            <button className="btn-modal-secondary" onClick={() => setIsProductModalOpen(false)}>Hủy</button>
                            <button className="btn-modal-primary" onClick={addToCart}>Thêm vào giỏ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL THANH TOÁN ĐẦY ĐỦ */}
            {isPaymentModalOpen && (
                <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Thanh Toán</h3>
                            <button className="btn-close-modal" onClick={() => setIsPaymentModalOpen(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            {/* Chọn bàn */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Vị trí khách ngồi:</label>
                                <select
                                    value={selectedTableForPayment}
                                    onChange={e => setSelectedTableForPayment(e.target.value)}
                                    style={{ width: '100%', padding: 12, borderRadius: 6 }}
                                >
                                    <option value="counter">Tại Quầy</option>
                                    {[...Array(20)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>Bàn {i + 1}</option>
                                    ))}
                                </select>
                            </div>

                            {/* === TÍCH ĐIỂM & SỬ DỤNG ĐIỂM (NEW UI) === */}
                            <div className="points-section">
                                <div className="loyalty-header">
                                    <span className="loyalty-icon">👤</span>
                                    Khách hàng thành viên
                                </div>

                                <div className="loyalty-body">
                                    {!isCustomerSelected ? (
                                        <div className="input-wrapper">
                                            <input
                                                className="phone-input"
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                                                placeholder="Nhập số điện thoại khách hàng..."
                                                maxLength={11}
                                                autoFocus
                                            />

                                            {showSuggestions && suggestedCustomers.length > 0 && (
                                                <div className="suggestions-dropdown">
                                                    {suggestedCustomers.map(cust => (
                                                        <div
                                                            key={cust.phoneNumber}
                                                            className="suggestion-item"
                                                            onClick={() => selectCustomer(cust)}
                                                        >
                                                            <span><strong>{cust.phoneNumber}</strong> - {cust.name}</span>
                                                            <span style={{ color: '#27ae60', fontWeight: 'bold' }}>{cust.points.toLocaleString()} 💎</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {customerPhone.length >= 9 && suggestedCustomers.length === 0 && (
                                                <div style={{ marginTop: 10, animation: 'fadeIn 0.3s' }}>
                                                    <input
                                                        className="phone-input"
                                                        style={{ fontSize: '0.9rem', padding: '8px 12px', background: '#f9f9f9' }}
                                                        type="text"
                                                        value={customerName}
                                                        onChange={e => setCustomerName(e.target.value)}
                                                        placeholder="Nhập tên khách mới để tạo..."
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="customer-card-info">
                                            <div className="customer-row-top">
                                                <div className="customer-name-display">{customerName}</div>
                                                <button
                                                    className="btn-change-customer"
                                                    onClick={() => {
                                                        setCustomerPhone("");
                                                        setCustomerName("");
                                                        setCustomerPoints(0);
                                                        setUsePoints(false);
                                                        setPointsToUse(0);
                                                        setSuggestedCustomers([]);
                                                        setIsCustomerSelected(false);
                                                    }}
                                                >
                                                    Thay đổi
                                                </button>
                                            </div>

                                            <div className="points-row-display">
                                                <span className="diamond-icon">💎</span>
                                                <span>{customerPoints.toLocaleString()} điểm khả dụng</span>
                                            </div>

                                            <div className="divider-line"></div>

                                            <div className="toggle-row">
                                                <span className="toggle-label">Dùng điểm trừ tiền?</span>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={usePoints}
                                                        onChange={e => {
                                                            setUsePoints(e.target.checked);
                                                            if (!e.target.checked) setPointsToUse(0);
                                                            else {
                                                                const max = Math.min(customerPoints, Math.floor(finalTotal / 1000));
                                                                setPointsToUse(max);
                                                            }
                                                        }}
                                                        disabled={customerPoints <= 0}
                                                    />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>

                                            {usePoints && (
                                                <div style={{ animation: 'slideUp 0.2s' }}>
                                                    <input
                                                        type="number"
                                                        className="points-input-custom"
                                                        value={pointsToUse}
                                                        onChange={e => {
                                                            let val = Number(e.target.value) || 0;
                                                            const max = Math.min(customerPoints, Math.floor(finalTotal / 1000));
                                                            setPointsToUse(Math.max(0, Math.min(val, max)));
                                                        }}
                                                        onClick={(e) => e.target.select()}
                                                    />
                                                    <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#777', marginTop: 4 }}>
                                                        (Quy đổi: -{(pointsToUse * 1000).toLocaleString()} ₫)
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* === BẢNG TỔNG HỢP THANH TOÁN (MỚI THÊM) === */}
                            <div className="payment-summary-mini">
                                <div className="payment-summary-row">
                                    <span>Tổng tiền hàng:</span>
                                    <span>{roundToThousand(subTotal).toLocaleString()} ₫</span>
                                </div>
                                {appliedDiscount && (
                                    <div className="payment-summary-row" style={{ color: '#27ae60', fontWeight: 'bold' }}>
                                        <span>Giảm giá ({appliedDiscount.code} -{appliedDiscount.discountPercentage * 100}%):</span>
                                        <span>-{roundToThousand(discountAmount).toLocaleString()} ₫</span>
                                    </div>
                                )}
                                {usePoints && pointsToUse > 0 && (
                                    <div className="payment-summary-row" style={{ color: '#d35400' }}>
                                        <span>Tiêu điểm ({pointsToUse.toLocaleString()} điểm):</span>
                                        <span>-{roundToThousand(pointsDiscount).toLocaleString()} ₫</span>
                                    </div>
                                )}
                                <div className="payment-summary-total">
                                    <span>KHÁCH CẦN TRẢ:</span>
                                    <span>{roundToThousand(finalTotal).toLocaleString()} ₫</span>
                                </div>
                            </div>

                            {/* Phần thanh toán còn lại */}
                            <div className="payment-tabs">
                                <div
                                    className={`payment-tab ${paymentMethod === 'CASH' ? 'active' : ''}`}
                                    onClick={() => handleSelectMethod('CASH')}
                                >
                                    Tiền mặt
                                </div>
                                <div
                                    className={`payment-tab ${paymentMethod === 'VNPAY' ? 'active' : ''}`}
                                    onClick={() => handleSelectMethod('VNPAY')}
                                >
                                    VNPay
                                </div>
                            </div>

                            {paymentMethod === 'CASH' && (
                                <div className="cash-input-group">
                                    <div className="cash-input-row">
                                        <span>Khách đưa:</span>
                                        <input
                                            className="cash-input"
                                            value={customerCash}
                                            onChange={e => {
                                                const v = e.target.value.replace(/\D/g, "");
                                                setCustomerCash(v);
                                                setChangeAmount(Number(v) - finalTotal);
                                            }}
                                        />
                                    </div>
                                    <div className="cash-input-row" style={{ marginTop: 10 }}>
                                        <span>Tiền thừa:</span>
                                        <span className="cash-change-display">
                                            {roundToThousand(changeAmount) > 0 ? roundToThousand(changeAmount).toLocaleString('vi-VN') : 0} ₫
                                        </span>
                                    </div>
                                </div>
                            )}

                            {paymentMethod && (
                                <div style={{ marginTop: 20 }}>
                                    {paymentMethod === 'VNPAY' ? (
                                        !isVNPayLinkSent ? (
                                            <button className="btn-confirm-payment btn-vnpay" onClick={handleSendVNPay}>
                                                GỬI LINK VNPAY CHO KHÁCH
                                            </button>
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>
                                                Đã gửi link! Đợi khách thanh toán...
                                            </div>
                                        )
                                    ) : (
                                        <button
                                            className="btn-confirm-payment"
                                            onClick={() => confirmOrderPayment(cart, selectedTableForPayment, paymentMethod)}
                                            disabled={isProcessing || (paymentMethod === 'CASH' && Number(customerCash) < finalTotal)}
                                        >
                                            HOÀN TẤT THANH TOÁN
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashierPOS;