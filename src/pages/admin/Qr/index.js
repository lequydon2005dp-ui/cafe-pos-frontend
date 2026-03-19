import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';

const QrGenerator = () => {
    const navigate = useNavigate();
    const qrRef = useRef(); // Dùng để tham chiếu tới thẻ chứa QR để tải ảnh

    // Mặc định lấy IP/Domain hiện tại của trình duyệt để tiện lợi
    // Ví dụ: Nếu bạn đang vào bằng 192.168.1.5:3000 thì nó tự điền vào luôn
    const [host, setHost] = useState(`http://172.20.10.2:3000`);
    const [tableNum, setTableNum] = useState(1);

    // --- 1. KIỂM TRA QUYỀN ADMIN ---
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            alert("Vui lòng đăng nhập Admin!");
            navigate('/admin/login');
        }
    }, [navigate]);

    // Link đích mà khách hàng sẽ truy cập
    const qrLink = `${host}/orders?table=${tableNum}`;

    // --- 2. HÀM TẢI ẢNH QR ---
    const downloadQR = () => {
        // Tìm thẻ canvas trong div ref
        const canvas = qrRef.current.querySelector('canvas');
        if (canvas) {
            const url = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_Ban_So_${tableNum}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', margin: '0 auto', background: 'white', borderRadius: '20px', }}>
            <h2 style={{ textAlign: 'center', color: '#333' }}>🖨️ TẠO MÃ QR ĐẶT MÓN</h2>

            <div style={styles.card}>
                {/* Cấu hình Link
                <div style={{ marginBottom: '20px' }}>
                    <label style={styles.label}>Địa chỉ máy chủ (Domain/IP):</label>
                    <input
                        type="text"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        style={styles.input}
                        placeholder="VD: http://192.168.1.10:3000"
                    />
                    <small style={{ color: '#666', fontStyle: 'italic' }}>
                        *Lưu ý: Phải dùng IP mạng LAN (VD: 192.168...) để khách dùng điện thoại quét được. Không dùng localhost.
                    </small>
                </div> */}

                <div style={{ marginBottom: '20px' }}>
                    <label style={styles.label}>Số bàn:</label>
                    <input
                        type="number"
                        value={tableNum}
                        onChange={(e) => setTableNum(e.target.value)}
                        style={{ ...styles.input, width: '100px' }}
                    />
                </div>

                {/* Khu vực hiển thị QR */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div ref={qrRef} style={styles.qrFrame}>
                        <QRCodeCanvas
                            value={qrLink}
                            size={200}
                            level={"H"} // Mức độ sửa lỗi cao nhất (để in ra không bị mờ)
                            includeMargin={true}
                        />
                        <p style={{ margin: '10px 0 0', fontWeight: 'bold', fontSize: '20px', textAlign: 'center' }}>
                            BÀN SỐ {tableNum}
                        </p>
                    </div>

                    <p style={{ marginTop: '15px', wordBreak: 'break-all', color: '#007bff' }}>
                        Link đích: <a href={qrLink} target="_blank" rel="noreferrer">{qrLink}</a>
                    </p>

                    <button onClick={downloadQR} style={styles.btnDownload}>
                        ⬇️ Tải Ảnh QR Về Máy
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- STYLES ---
const styles = {
    card: {
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        border: '1px solid #ddd'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold',
        color: '#555'
    },
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        fontSize: '16px',
        boxSizing: 'border-box'
    },
    qrFrame: {
        border: '2px solid #333',
        padding: '20px',
        borderRadius: '10px',
        background: '#fff',
        display: 'inline-block'
    },
    btnDownload: {
        marginTop: '20px',
        padding: '12px 24px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        fontSize: '16px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
    }
};

export default QrGenerator;