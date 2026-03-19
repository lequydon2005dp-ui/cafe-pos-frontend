/**
 * Service xử lý logic phản hồi từ VNPay
 * Lưu ý: Service này CHỈ xử lý dữ liệu client-side (URL Params)
 * Nó KHÔNG gọi API lưu đơn hàng (việc đó do CashierPOS thực hiện qua Socket)
 */
export const VNPayService = {
    /**
     * Xử lý kết quả trả về từ VNPay
     * @param {URLSearchParams} searchParams - Params lấy từ URL
     * @param {string} channelId - ID bàn hiện tại (hoặc 'counter')
     */
    processPaymentResponse: async (searchParams, channelId) => {
        const vnpResponseCode = searchParams.get('vnp_ResponseCode');
        const vnpTxnRef = searchParams.get('vnp_TxnRef');        // Mã đơn hàng phía Merchant
        const vnpTransactionNo = searchParams.get('vnp_TransactionNo'); // Mã giao dịch phía VNPay

        // 1. Nếu không có mã phản hồi -> Không phải là redirect từ VNPay
        if (!vnpResponseCode) {
            return { status: 'NO_PAYMENT', message: '' };
        }

        console.log(`VNPay Return: Code=${vnpResponseCode}, TxnRef=${vnpTxnRef}`);

        // 2. Xử lý trường hợp THÀNH CÔNG (Mã '00')
        if (vnpResponseCode === '00') {
            // Lấy lại thông tin bàn đã lưu trong LocalStorage lúc nhấn nút thanh toán
            // (Phòng trường hợp khách quét QR bàn 1 nhưng lại ngồi sang bàn 2, hoặc reload mất state)
            const savedTable = localStorage.getItem('pendingTable');

            let finalTableNumber = savedTable;

            // Nếu không có trong storage, dùng channelId hiện tại từ URL
            if (!finalTableNumber && channelId && channelId !== 'counter') {
                finalTableNumber = String(channelId);
            }

            // Dọn dẹp storage
            localStorage.removeItem('pendingTable');
            localStorage.removeItem('pendingCart'); // Xóa backup cart (nếu có)

            return {
                status: 'SUCCESS',
                message: 'Giao dịch VNPay thành công!',
                transactionCode: vnpTxnRef,      // Cần mã này để lưu vào DB
                bankTransNo: vnpTransactionNo,   // Mã tham chiếu ngân hàng (tùy chọn lưu)
                tableNumber: finalTableNumber
            };
        }

        // 3. Xử lý trường hợp KHÁCH HỦY GIAO DỊCH (Mã '24')
        else if (vnpResponseCode === '24') {
            return {
                status: 'FAILED',
                message: 'Bạn đã hủy giao dịch thanh toán.'
            };
        }

        // 4. Các mã lỗi khác từ VNPay
        else {
            return {
                status: 'FAILED',
                message: `Thanh toán thất bại. Mã lỗi VNPay: ${vnpResponseCode}`
            };
        }
    }
};