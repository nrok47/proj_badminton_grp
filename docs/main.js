// main.js - A simplified example
// ถ้าคุณไม่ได้ติดตั้ง @line/liff ผ่าน npm (และใช้ CDN แทน), คุณไม่จำเป็นต้องมีบรรทัดนี้
// import liff from '@line/liff'; 

const LIFF_ID = '2007522746-g2a1qOPj'; // <<< ต้องเปลี่ยนเป็น LIFF ID ของคุณที่ได้จาก LINE Developers Console
const API_BASE_URL = 'http://localhost:3000'; // <<< ต้องเปลี่ยนเป็น URL ของ Backend API ของคุณ

async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        
        // เช็คว่าเปิดใน LINE หรือไม่
        if (!liff.isInClient() && !liff.isLoggedIn()) {
            // ถ้าเปิดในเบราว์เซอร์และยังไม่ได้ล็อกอิน ให้ล็อกอินก่อน
            liff.login();
            return;
        }

        // ดึงข้อมูลโปรไฟล์และแสดงผล
        const profile = await liff.getProfile();
        document.getElementById('user-display-name').textContent = profile.displayName;
        document.getElementById('profile-picture').src = profile.pictureUrl;
        document.getElementById('profile').style.display = 'flex';

        // เริ่มต้นฟังก์ชันอื่นๆ
        setupForms();
        loadTickets();

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

async function setupForms() {
    const form = document.getElementById('create-ticket-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // ดึงข้อมูลจากฟอร์ม
            const formData = {
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                location: document.getElementById('location').value,
                maxPlayers: parseInt(document.getElementById('max-players').value),
                details: document.getElementById('details').value
            };

            // ดึง token จาก LIFF
            const accessToken = liff.getAccessToken();
            if (!accessToken) {
                throw new Error('ไม่สามารถดึง LIFF Access Token ได้');
            }

            // ส่งข้อมูลไปยัง API
            const response = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'ไม่สามารถสร้างตั๋วได้');
            }

            // แสดงข้อความสำเร็จ
            alert('สร้างตั๋วสำเร็จ!');
            form.reset();
            loadTickets();

            // ส่งข้อความไปยังแชท (ถ้าเปิดใน LINE)
            if (liff.isInClient()) {
                await liff.sendMessages([
                    {
                        type: 'text',
                        text: `🏸 สร้างตั๋วแบดมินตันใหม่!\n📍 ${formData.location}\n📅 ${formData.date} ${formData.time}\n👥 ผู้เล่นสูงสุด: ${formData.maxPlayers} คน\n\n${formData.details}`
                    }
                ]);
            }

        } catch (err) {
            console.error('Error creating ticket:', err);
            alert(`เกิดข้อผิดพลาด: ${err.message}`);
        }
    });
}

async function loadTickets() {
    const ticketList = document.getElementById('ticket-list');
    if (!ticketList) return;

    try {
        const accessToken = liff.getAccessToken();
        const response = await fetch(`${API_BASE_URL}/tickets`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('ไม่สามารถโหลดรายการตั๋วได้');
        }

        const tickets = await response.json();
        
        if (tickets.length === 0) {
            ticketList.innerHTML = '<p style="text-align: center;">ยังไม่มีตั๋วที่เปิดอยู่</p>';
            return;
        }

        ticketList.innerHTML = tickets.map(ticket => `
            <div class="ticket-item">
                <h3>${ticket.location}</h3>
                <p>📅 วันที่: ${new Date(ticket.date).toLocaleDateString('th-TH')}</p>
                <p>⌚ เวลา: ${ticket.time}</p>
                <p>👥 ผู้เล่น: ${ticket.joinedPlayers.length}/${ticket.maxPlayers}</p>
                <p>📝 รายละเอียด: ${ticket.details || '-'}</p>
                <button onclick="joinTicket('${ticket._id}')" class="join-btn">เข้าร่วม</button>
                <button onclick="viewPlayers('${ticket._id}')" class="view-players-btn">ดูผู้เล่น</button>
                <div id="players-${ticket._id}" class="players-list" style="display: none;"></div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading tickets:', err);
        ticketList.innerHTML = `
            <p style="color: red; text-align: center;">
                เกิดข้อผิดพลาดในการโหลดรายการตั๋ว<br>
                Error: ${err.message}
            </p>`;
    }
}

async function joinTicket(ticketId) {
    try {
        const accessToken = liff.getAccessToken();
        const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'ไม่สามารถเข้าร่วมได้');
        }

        alert('เข้าร่วมสำเร็จ!');
        loadTickets();

        // ส่งข้อความไปยังแชท (ถ้าเปิดใน LINE)
        if (liff.isInClient()) {
            const ticket = await response.json();
            await liff.sendMessages([
                {
                    type: 'text',
                    text: `✅ เข้าร่วมกิจกรรมแบดมินตันแล้ว!\n📍 ${ticket.location}\n📅 ${new Date(ticket.date).toLocaleDateString('th-TH')} ${ticket.time}`
                }
            ]);
        }

    } catch (err) {
        console.error('Error joining ticket:', err);
        alert(`เกิดข้อผิดพลาด: ${err.message}`);
    }
}

async function viewPlayers(ticketId) {
    const playersList = document.getElementById(`players-${ticketId}`);
    if (!playersList) return;

    if (playersList.style.display === 'block') {
        playersList.style.display = 'none';
        return;
    }

    try {
        const accessToken = liff.getAccessToken();
        const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/players`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('ไม่สามารถโหลดรายชื่อผู้เล่นได้');
        }

        const players = await response.json();
        
        playersList.innerHTML = `
            <h4>รายชื่อผู้เล่น:</h4>
            ${players.length === 0 ? '<p>ยังไม่มีผู้เข้าร่วม</p>' : `
                <ul>
                    ${players.map(player => `
                        <li>
                            <img src="${player.pictureUrl || 'https://via.placeholder.com/30'}" 
                                 width="30" height="30" 
                                 style="border-radius:50%; vertical-align: middle; margin-right: 5px;">
                            ${player.displayName}
                        </li>
                    `).join('')}
                </ul>
            `}
        `;
        playersList.style.display = 'block';

    } catch (err) {
        console.error('Error loading players:', err);
        playersList.innerHTML = `
            <p style="color: red;">
                เกิดข้อผิดพลาดในการโหลดรายชื่อผู้เล่น<br>
                Error: ${err.message}
            </p>`;
        playersList.style.display = 'block';
    }
}

// เริ่มต้นแอพเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', initializeLiff); 