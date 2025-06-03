// main.js - A simplified example
// ถ้าคุณไม่ได้ติดตั้ง @line/liff ผ่าน npm (และใช้ CDN แทน), คุณไม่จำเป็นต้องมีบรรทัดนี้
// import liff from '@line/liff'; 

const LIFF_ID = '2007522746-g2a1qOPj'; // <<< ต้องเปลี่ยนเป็น LIFF ID ของคุณที่ได้จาก LINE Developers Console (e.g., '2007522746-g2a1o0p')
const API_BASE_URL = 'http://localhost:3000'; // <<< ต้องเปลี่ยนเป็น URL ของ Backend API ของคุณ (e.g., 'http://localhost:3000' สำหรับทดสอบ)

async function initializeLiff() {
    try {
        // ใช้ liff.init() โดยตรง เพราะเราโหลด SDK ผ่าน CDN
        await liff.init({ liffId: LIFF_ID });
        
        // ตรวจสอบสถานะการเข้าสู่ระบบ
        if (!liff.isLoggedIn()) {
            // ถ้ายังไม่ได้เข้าสู่ระบบ ให้พาไปหน้า Login ของ LINE
            liff.login();
        } else {
            // ถ้าเข้าสู่ระบบแล้ว ให้แสดงข้อมูลโปรไฟล์และโหลดข้อมูลอื่นๆ
            displayUserProfile();
            loadTickets();
            setupForms();
        }
    } catch (err) {
        console.error('LIFF initialization failed', err);
        // แสดงข้อความผิดพลาดบนหน้าเว็บหาก LIFF init ล้มเหลว
        document.getElementById('liff-app').innerHTML = '<p>Error: Could not initialize LIFF. Please try again later. Check your LIFF ID and internet connection.</p>';
    }
}

async function displayUserProfile() {
    try {
        const profile = await liff.getProfile();
        document.getElementById('user-display-name').textContent = profile.displayName;
        document.getElementById('profile-picture').src = profile.pictureUrl;
        document.getElementById('profile').style.display = 'flex'; // เปลี่ยนจาก 'block' เป็น 'flex' ให้ตรงกับ CSS
    } catch (err) {
        console.error('Could not get profile', err);
        // หากดึงโปรไฟล์ไม่ได้ อาจจะเพราะสิทธิ์ไม่พอหรือเกิดข้อผิดพลาด
        document.getElementById('profile').innerHTML = '<p>Could not load user profile.</p>';
        document.getElementById('profile').style.display = 'block';
    }
}

async function loadTickets() {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tickets = await response.json();
        const ticketListDiv = document.getElementById('ticket-list');
        ticketListDiv.innerHTML = ''; // ล้างรายการตั๋วก่อนหน้า

        if (tickets.length === 0) {
            ticketListDiv.innerHTML = '<p>No tickets available yet.</p>';
            return;
        }

        tickets.forEach(ticket => {
            const ticketDiv = document.createElement('div');
            ticketDiv.className = 'ticket-item';
            
            // Format date to be more readable
            const ticketDate = new Date(ticket.date).toLocaleDateString('th-TH', { 
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
            });

            ticketDiv.innerHTML = `
                <h3>${ticket.location} - ${ticketDate} ${ticket.time}</h3>
                <p>Players: ${ticket.joinedPlayers.length}/${ticket.maxPlayers}</p>
                <p>Creator: ${ticket.creatorDisplayName || 'N/A'}</p>
                <p>${ticket.details}</p>
                <button class="join-btn" data-ticket-id="${ticket._id}">Join</button>
                <button class="view-players-btn" data-ticket-id="${ticket._id}">View Players</button>
                <div id="players-${ticket._id}" class="players-list" style="display:none;"></div>
            `;
            ticketListDiv.appendChild(ticketDiv);
        });

        // แนบ Event Listeners หลังจากโหลดตั๋วทั้งหมดแล้ว
        document.querySelectorAll('.join-btn').forEach(btn => {
            btn.onclick = (e) => joinTicket(e.target.dataset.ticketId);
        });
        document.querySelectorAll('.view-players-btn').forEach(btn => {
            btn.onclick = (e) => togglePlayersList(e.target.dataset.ticketId);
        });

    } catch (err) {
        console.error('Failed to load tickets', err);
        document.getElementById('ticket-list').innerHTML = '<p>Error loading tickets. Please ensure backend is running.</p>';
    }
}

async function setupForms() {
    // ฟอร์มสร้าง Ticket
    document.getElementById('create-ticket-form').addEventListener('submit', async (e) => {
        e.preventDefault(); // ป้องกันการ Submit ฟอร์มแบบปกติ
        
        // ดึงค่าจากฟอร์ม
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const location = document.getElementById('location').value;
        const maxPlayers = document.getElementById('max-players').value;
        const details = document.getElementById('details').value;

        // ตรวจสอบว่าเข้าสู่ระบบ LIFF แล้ว
        if (!liff.isLoggedIn()) {
            liff.login(); // พาผู้ใช้ไป Login
            return;
        }

        try {
            const accessToken = liff.getAccessToken(); // ดึง Access Token ของ LIFF
            if (!accessToken) {
                alert('Could not get LIFF Access Token. Please try again.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}` // ส่ง LIFF Access Token ไปยัง Backend
                },
                body: JSON.stringify({ date, time, location, maxPlayers: parseInt(maxPlayers), details })
            });

            if (response.ok) {
                alert('Ticket created successfully!');
                document.getElementById('create-ticket-form').reset(); // ล้างฟอร์ม
                loadTickets(); // โหลดรายการตั๋วใหม่
            } else {
                const error = await response.json();
                alert(`Failed to create ticket: ${error.message}`);
            }
        } catch (err) {
            console.error('Error creating ticket:', err);
            alert('An error occurred while creating the ticket. Please check console for details.');
        }
    });
}

async function joinTicket(ticketId) {
    if (!liff.isLoggedIn()) {
        liff.login();
        return;
    }
    try {
        const accessToken = liff.getAccessToken();
        if (!accessToken) {
            alert('Could not get LIFF Access Token. Please try again.');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            alert('Joined ticket successfully!');
            loadTickets(); // Reload list to update player count

            // --- Optional: Send a message to LINE group after joining ---
            // ตรวจสอบว่าแอปถูกเปิดใน Group หรือ Room
            const context = liff.getContext();
            if (context.type === 'group' || context.type === 'room') {
                try {
                    await liff.sendMessages([
                        {
                            type: 'text',
                            text: `ฉันเข้าร่วมกิจกรรมตีแบดแล้ว! คลิกเพื่อดูรายละเอียด: ${liff.get
                                LiffUrl()}` // ส่ง URL ของ LIFF กลับไปด้วย
                        }
                    ]);
                    // ปิดหน้า LIFF หลังจากส่งข้อความ (เป็นทางเลือก)
                    // liff.closeWindow();
                } catch (sendMsgErr) {
                    console.error('Failed to send message:', sendMsgErr);
                    alert('Failed to send message to chat. Please check permissions.');
                }
            }

        } else {
            const error = await response.json();
            alert(`Failed to join ticket: ${error.message}`);
        }
    } catch (err) {
        console.error('Error joining ticket:', err);
        alert('An error occurred while joining the ticket. Please check console for details.');
    }
}

async function togglePlayersList(ticketId) {
    const playersDiv = document.getElementById(`players-${ticketId}`);
    if (playersDiv.style.display === 'block') {
        playersDiv.style.display = 'none';
    } else {
        try {
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/players`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const players = await response.json();
            
            playersDiv.innerHTML = '<h4>Participants:</h4>';
            if (players.length === 0) {
                playersDiv.innerHTML += '<p>No one has joined yet.</p>';
            } else {
                const ul = document.createElement('ul');
                players.forEach(player => {
                    const li = document.createElement('li');
                    li.innerHTML = `<img src="${player.pictureUrl || 'default_profile.png'}" width="20" height="20" style="border-radius:50%; vertical-align: middle; margin-right: 5px;"> ${player.displayName}`;
                    ul.appendChild(li);
                });
                playersDiv.appendChild(ul);
            }
            playersDiv.style.display = 'block';
        } catch (err) {
            console.error('Failed to load players:', err);
            playersDiv.innerHTML = '<p>Error loading players.</p>';
            playersDiv.style.display = 'block';
        }
    }
}


// --- Start LIFF App ---
// เรียกฟังก์ชันเริ่มต้นเมื่อ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', initializeLiff);