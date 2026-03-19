import React from 'react';
import { useSearchParams } from 'react-router-dom';
import MenuMobile from '../MenuMobile';


const OrderPage = () => {
    // Hook này dùng để lấy tham số trên thanh địa chỉ
    const [searchParams] = useSearchParams();
    
    // Lấy giá trị sau dấu bằng của chữ 'table'
    // Ví dụ link là: .../order?table=5 -> tableParam sẽ là "5"
    const tableParam = searchParams.get('table');

    // Kiểm tra: Nếu có số bàn -> isQrCode = true. Ngược lại là false.
    const isQrCode = !!tableParam; 

    console.log("Link hiện tại:", window.location.href);
    console.log("Số bàn tìm thấy:", tableParam);
    console.log("Là QR Code?", isQrCode);

    return (
        <MenuMobile 
            isQrCode={isQrCode} 
            tableNumber={tableParam} 
        />
    );
};

export default OrderPage;