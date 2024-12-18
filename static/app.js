const API_URL = "https://cheongsongdae.onrender.com";

const users = [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "user1", password: "user123", role: "user" },
];

const loginSection = document.getElementById("loginSection");
const boardSection = document.getElementById("boardSection");
const userRoleSpan = document.getElementById("userRole");
const newPostForm = document.getElementById("newPostForm");
const logoutButton = document.getElementById("logoutButton");
const postList = document.getElementById("postList");
const paginationContainer = document.getElementById("pagination");

let currentUser = null;
let postsPerPage = 5;

// 페이지 로드 시 로그인 상태 확인
window.addEventListener("DOMContentLoaded", async () => {
    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        displayBoard();
        await fetchPosts(1); // 게시글 불러오기
    } else {
        showLogin();
    }
});

// 로그인 화면 표시
function showLogin() {
    loginSection.style.display = "block";
    boardSection.style.display = "none";
}

// 게시판 화면 표시
function displayBoard() {
    loginSection.style.display = "none";
    boardSection.style.display = "block";
    userRoleSpan.textContent = currentUser.role === "admin" ? "관리자님" : "익명님";
}

// 로그인 처리
document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const user = users.find((u) => u.username === username && u.password === password);
    if (user) {
        currentUser = user;
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        displayBoard();
        fetchPosts(1); // 게시글 불러오기
    } else {
        alert("아이디 또는 비밀번호가 잘못되었습니다.");
    }
});

// 로그아웃 처리
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    currentUser = null;
    showLogin();
});

// 게시글 불러오기
async function fetchPosts(page) {
    const offset = (page - 1) * postsPerPage;
    try {
        const response = await fetch(`${API_URL}/posts?limit=${postsPerPage}&offset=${offset}`);
        if (!response.ok) throw new Error("게시글 불러오기 실패");

        const data = await response.json();
        postList.innerHTML = "";
        data.posts.forEach((post) => renderPost(post));
        renderPagination(data.total, page);
    } catch (error) {
        console.error("게시글 로드 실패:", error);
        alert("게시글을 불러오는데 실패했습니다.");
    }
}

// 게시글 렌더링
function renderPost(post) {
    const postElement = document.createElement("div");
    postElement.className = "post";
    postElement.innerHTML = `
        <div class="post-header">
            <h3>${post.title}</h3>
        </div>
        <p>${post.content}</p>
    `;
    postList.appendChild(postElement);
}

// 페이지네이션 렌더링
function renderPagination(total, currentPage) {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(total / postsPerPage);

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.textContent = i;
        button.className = currentPage === i ? "active" : "";
        button.addEventListener("click", () => fetchPosts(i));
        paginationContainer.appendChild(button);
    }
}
