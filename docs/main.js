// main.js - A simplified example
// ถ้าคุณไม่ได้ติดตั้ง @line/liff ผ่าน npm (และใช้ CDN แทน), คุณไม่จำเป็นต้องมีบรรทัดนี้
// import liff from '@line/liff'; 

const LIFF_ID = '2007522746-g2a1qOPj'; // ตรวจสอบว่า LIFF ID นี้ตรงกับที่ได้จาก LINE Developers Console

// รอให้ LIFF SDK โหลดเสร็จก่อน
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบว่า LIFF SDK โหลดเสร็จแล้ว
    if (window.liff) {
        initializeLiff();
    } else {
        // ถ้ายังไม่โหลด ให้รอแล้วลองอีกครั้ง
        window.addEventListener('liff_init', initializeLiff);
    }
});

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        
        // เช็คว่าเปิดใน LINE หรือไม่
        if (!liff.isInClient()) {
            document.getElementById('error-message').style.display = 'block';
            document.getElementById('create-poll-form').style.display = 'none';
            return;
        }

        // ดึงข้อมูลโปรไฟล์และแสดงผล
        const profile = await liff.getProfile();
        document.getElementById('user-display-name').textContent = profile.displayName;
        document.getElementById('profile-picture').src = profile.pictureUrl;
        document.getElementById('profile').style.display = 'flex';

        // เริ่มต้นฟอร์ม
        setupForm();

    } catch (err) {
        console.error('LIFF initialization failed', err);
        document.getElementById('liff-app').innerHTML = `
            <p style="color: red; text-align: center;">
                Error: Could not initialize LIFF. <br>
                กรุณาตรวจสอบ LIFF ID และการเชื่อมต่ออินเทอร์เน็ต<br>
                Error details: ${err.message}
            </p>`;
    }
}

function setupForm() {
    const form = document.getElementById('create-poll-form');
    if (!form) return;

    // ตั้งค่าฟิลด์วันที่ให้เลือกได้เฉพาะวันในอนาคต
    const dateInput = document.getElementById('date');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    dateInput.setAttribute('min', todayStr);
    
    // ถ้าไม่ได้เลือกวันที่ ให้เลือกวันนี้เป็นค่าเริ่มต้น
    if (!dateInput.value) {
        dateInput.value = todayStr;
    }

    // ตั้งค่าฟิลด์เวลาให้เป็น 24 ชั่วโมง
    const timeInput = document.getElementById('time');
    if (timeInput) {
        timeInput.setAttribute('step', '900'); // ตั้งให้เลือกเวลาเป็นช่วงละ 15 นาที
        
        // ถ้าไม่ได้เลือกเวลา ให้เลือกเวลาถัดไปที่ใกล้ที่สุดเป็นค่าเริ่มต้น
        if (!timeInput.value) {
            const now = new Date();
            const minutes = Math.ceil(now.getMinutes() / 15) * 15;
            now.setMinutes(minutes, 0, 0);
            timeInput.value = now.toTimeString().slice(0, 5);
        }
    }

    // จัดการกับ location radio buttons
    const locationOther = document.getElementById('location2');
    const locationOtherInput = document.getElementById('location-other');

    // เมื่อเลือก radio button
    document.querySelectorAll('input[name="location"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'other') {
                locationOtherInput.disabled = false;
                locationOtherInput.required = true;
                locationOtherInput.focus();
            } else {
                locationOtherInput.disabled = true;
                locationOtherInput.required = false;
                locationOtherInput.value = '';
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;
            
            // ตรวจสอบวันและเวลา
            const selectedDateTime = new Date(`${date}T${time}`);
            const now = new Date();
            
            if (selectedDateTime < now) {
                alert('กรุณาเลือกวันและเวลาในอนาคต');
                return;
            }

            const selectedLocation = document.querySelector('input[name="location"]:checked');
            if (!selectedLocation) {
                alert('กรุณาเลือกสถานที่');
                return;
            }

            let location = selectedLocation.value;
            
            // ถ้าเลือก "อื่นๆ" ให้ใช้ค่าจาก input text
            if (location === 'other') {
                location = locationOtherInput.value.trim();
                if (!location) {
                    alert('กรุณาระบุสถานที่');
                    return;
                }
            }

            const details = document.getElementById('details').value;

            // แปลงวันที่เป็นรูปแบบไทย
            const thaiDate = new Date(date).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            });

            // แปลงเวลาให้อยู่ในรูปแบบ HH:mm
            const formattedTime = time.split(':').map(num => num.padStart(2, '0')).join(':');

            // สร้างข้อความสำหรับ Poll
            const pollMessage = `🏸 ชวนตีแบด!\n\n📅 ${thaiDate}\n⌚ ${formattedTime} น.\n📍 ${location}\n\n${details ? `📝 ${details}\n\n` : ''}มาตีแบดกัน! กดปุ่ม "👍" เพื่อเข้าร่วม`;

            // ส่งข้อความไปยังแชท
            await liff.sendMessages([
                {
                    type: 'text',
                    text: pollMessage
                }
            ]);

            // ปิดหน้า LIFF
            liff.closeWindow();

        } catch (err) {
            console.error('Error creating poll:', err);
            alert(`เกิดข้อผิดพลาด: ${err.message}`);
        }
    });
} 