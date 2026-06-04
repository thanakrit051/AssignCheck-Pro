// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyABv4bIS3H8wj7zoy5aZPtskfSLljJyGOw",
    authDomain: "assigncheck-pro-6e559.firebaseapp.com",
    projectId: "assigncheck-pro-6e559",
    storageBucket: "assigncheck-pro-6e559.firebasestorage.app",
    messagingSenderId: "855085128789",
    appId: "1:855085128789:web:b7693a44082e617f6448dc",
    measurementId: "G-Y1VSW0DBLM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const dbFirestore = firebase.firestore();

// DOM Elements
const loginSection = document.getElementById('loginSection');
const tasksSection = document.getElementById('tasksSection');
const classSelect = document.getElementById('classSelect');
const nameSelect = document.getElementById('nameSelect');
const checkButton = document.getElementById('checkButton');
const logoutButton = document.getElementById('logoutButton');
const displayStudentId = document.getElementById('displayStudentId');
const tasksList = document.getElementById('tasksList');
const loginErrorMsg = document.getElementById('loginErrorMsg');

let globalData = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
classSelect.addEventListener('change', handleClassChange);
nameSelect.addEventListener('change', handleNameChange);
checkButton.addEventListener('click', handleLogin);
logoutButton.addEventListener('click', handleLogout);

async function initializeApp() {
    try {
        classSelect.innerHTML = '<option value="" disabled selected>-- กำลังโหลดข้อมูล... --</option>';

        const docRef = dbFirestore.collection('assigncheck_users').doc('TyggIsu3ZTZgyUt7xYlNhzbn4X23');
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            globalData = docSnap.data();
            console.log("Firebase Data Loaded:", globalData);

            loginErrorMsg.style.display = 'none';

            if (globalData.classes && globalData.classes.length > 0) {
                populateClassesDropdown(globalData.classes);
            } else {
                showSchemaDebugger('ไม่พบโครงสร้าง classes ในข้อมูล');
            }
        } else {
            showError('ไม่พบข้อมูล Document TyggIsu3ZTZgyUt7xYlNhzbn4X23');
        }
    } catch (error) {
        console.error("Firebase error", error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    }
}

function showSchemaDebugger(msg) {
    loginErrorMsg.style.display = 'block';
    loginErrorMsg.style.backgroundColor = '#e0f2fe';
    loginErrorMsg.style.color = '#0369a1';
    loginErrorMsg.style.textAlign = 'left';
    loginErrorMsg.style.fontSize = '12px';

    const debugInfo = {
        classes_example: globalData && globalData.classes
            ? (Array.isArray(globalData.classes) ? globalData.classes[0] : Object.values(globalData.classes)[0])
            : null,
        submissions_example: globalData && globalData.submissions
            ? (Array.isArray(globalData.submissions) ? globalData.submissions[0] : Object.values(globalData.submissions)[0])
            : null,
        top_level_keys: globalData ? Object.keys(globalData) : []
    };

    loginErrorMsg.innerHTML = `
        <strong>${msg || 'ระบบต้องการทราบโครงสร้างข้อมูลเพิ่มเติม'}</strong> รบกวนแคปจอนี้ให้ AI ดูครับ:<br>
        <pre style="white-space: pre-wrap; overflow-x: auto; margin-top: 10px;">${JSON.stringify(debugInfo, null, 2)}</pre>
    `;
}

function populateClassesDropdown(classesArr) {
    classSelect.innerHTML = '<option value="" disabled selected>-- เลือกห้องเรียน --</option>';

    classesArr.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        // แสดง: "คณิตศาสตร์พื้นฐาน (ค21101) ม.1/1"
        const subject = c.subject || c.name || 'ไม่ทราบวิชา';
        const grade = c.grade ? ` ม.${c.grade}` : '';
        option.textContent = subject + grade;
        classSelect.appendChild(option);
    });
}

async function handleClassChange() {
    const selectedClassId = classSelect.value;
    if (!selectedClassId) return;

    nameSelect.innerHTML = '<option value="" disabled selected>-- กำลังโหลดรายชื่อ --</option>';
    nameSelect.disabled = true;
    checkButton.disabled = true;

    const cls = globalData.classes.find(c => c.id === selectedClassId);
    if (!cls || !cls.students || cls.students.length === 0) {
        nameSelect.innerHTML = '<option value="" disabled selected>ไม่พบรายชื่อในห้องนี้</option>';
        return;
    }

    const studentsArr = Array.isArray(cls.students) ? cls.students : Object.values(cls.students);
    populateNamesDropdown(studentsArr);
}

function populateNamesDropdown(students) {
    nameSelect.innerHTML = '<option value="" disabled selected>-- เลือกชื่อ-นามสกุล --</option>';

    // เรียงตามเลขที่ถ้ามี
    console.log("=== student object sample ===", students[0]);

    const sorted = [...students].sort((a, b) => {
        const noA = parseInt(a.no || a.number || a.order || 0);
        const noB = parseInt(b.no || b.number || b.order || 0);
        return noA - noB;
    });

    sorted.forEach(student => {
        const option = document.createElement('option');
        // ใช้ num เป็น key สำหรับ match กับ submissions[assignmentId][num]
        option.value = student.num || student.id || student.studentId;

        const name = student.name || student.fullname || 'ไม่มีชื่อ';
        const no = student.num || student.no || student.number;
        option.textContent = no ? `เลขที่ ${no} - ${name}` : name;

        nameSelect.appendChild(option);
    });

    nameSelect.disabled = false;
}

function handleNameChange() {
    checkButton.disabled = !nameSelect.value;
}

function handleLogin() {
    const studentId = nameSelect.value;
    const studentName = nameSelect.options[nameSelect.selectedIndex].text;
    const classId = classSelect.value;

    if (!studentId || !classId) return;

    loginErrorMsg.style.display = 'none';

    loginSection.style.display = 'none';
    tasksSection.style.display = 'block';
    displayStudentId.textContent = studentName;

    fetchStudentTasks(classId, studentId);
}

function handleLogout() {
    classSelect.selectedIndex = 0;
    nameSelect.innerHTML = '<option value="" disabled selected>-- เลือกชื่อ-นามสกุล --</option>';
    nameSelect.disabled = true;
    checkButton.disabled = true;

    tasksSection.style.display = 'none';
    loginSection.style.display = 'block';
    loginErrorMsg.style.display = 'none';
    tasksList.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>กำลังโหลดข้อมูล...</p>
        </div>
    `;
}

function showError(msg) {
    loginErrorMsg.textContent = msg;
    loginErrorMsg.style.backgroundColor = '';
    loginErrorMsg.style.color = '';
    loginErrorMsg.style.textAlign = '';
    loginErrorMsg.style.fontSize = '';
    loginErrorMsg.style.display = 'block';
}

function fetchStudentTasks(classId, studentId) {
    tasksList.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>กำลังโหลดงานของคุณ...</p>
        </div>
    `;

    const allAssignments = Array.isArray(globalData.assignments)
        ? globalData.assignments
        : Object.values(globalData.assignments || {});

    const classAssignments = allAssignments.filter(a => {
        if (Array.isArray(a.classId)) return a.classId.includes(classId);
        return a.classId === classId;
    });

    if (classAssignments.length === 0) {
        tasksList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">ไม่พบงานสำหรับห้องเรียนนี้</p>';
        return;
    }

    // submissions โครงสร้างจริง: { assignmentId: { studentNum: { status } } }
    const submissionsMap = globalData.submissions || {};

    const tasks = classAssignments.map(assignment => {
        // ดึง submission ของนักเรียนคนนี้ในงานชิ้นนี้
        const assignmentSubs = submissionsMap[assignment.id] || {};
        const submission = assignmentSubs[studentId]; // studentId = student.num เช่น "01"

        let status = 'missing';
        if (submission && submission.status) {
            status = submission.status;
        }

        return {
            title: assignment.title || assignment.name,
            subject: assignment.desc || assignment.description,
            status: status,
            due: assignment.due || assignment.dueDate
        };
    });

    renderTasks(tasks);
}

function renderTasks(tasks) {
    let html = '';
    tasks.forEach(task => {
        let statusClass = '';
        let statusText = '';

        const s = (task.status || '').toLowerCase();
        if (s === 'done' || s === 'checked' || s === 'graded' || s === 'เสร็จสิ้น') {
            statusClass = 'status-done';
            statusText = 'ส่งแล้ว';
        } else if (s === 'late') {
            statusClass = 'status-late';
            statusText = 'ส่งช้า';
        } else if (s === 'pending' || s === 'submitted') {
            statusClass = 'status-pending';
            statusText = 'รอตรวจ';
        } else {
            statusClass = 'status-missing';
            statusText = 'ยังไม่ส่ง';
        }

        const dueText = task.due
            ? `<small style="color: #ef4444; margin-top: 5px; display: block;">กำหนดส่ง: ${task.due}</small>`
            : '';

        html += `
            <div class="task-item">
                <div class="task-details">
                    <h3>${task.title || 'ไม่มีชื่องาน'}</h3>
                    <p>${task.subject || 'ไม่มีรายละเอียด'}</p>
                    ${dueText}
                </div>
                <div class="task-status ${statusClass}">
                    ${statusText}
                </div>
            </div>
        `;
    });

    tasksList.innerHTML = html;
}
