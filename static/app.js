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
window.addEventListener("DOMContentLoaded", () => {
    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        displayBoard();
    } else {
        showLogin();
    }
});

function showLogin() {
    loginSection.style.display = "block";
    boardSection.style.display = "none";
}

function displayBoard() {
    loginSection.style.display = "none";
    boardSection.style.display = "block";
    userRoleSpan.textContent = currentUser.role === "admin" ? "관리자님" : "익명님";
    fetchPosts(1);
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const user = users.find((u) => u.username === username && u.password === password);
    if (user) {
        currentUser = user;
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        displayBoard();
    } else {
        alert("아이디 또는 비밀번호가 잘못되었습니다.");
    }
});

logoutButton.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    currentUser = null;
    showLogin();
});

newPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;

    await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, author: currentUser.username }),
    });
    fetchPosts(1);
    newPostForm.reset();
});

async function fetchPosts(page) {
    const offset = (page - 1) * postsPerPage;
    const response = await fetch(`${API_URL}/posts?limit=${postsPerPage}&offset=${offset}`);
    const data = await response.json();

    postList.innerHTML = "";
    data.posts.forEach((post) => renderPost(post));
    renderPagination(data.total, page);
}

function renderPost(post) {
    const postElement = document.createElement("div");
    postElement.className = "post";
    postElement.innerHTML = `
        <div class="post-header">
            <h3>${post.title}</h3>
            <div class="menu-container">
                <button class="menu-btn">⋮</button>
                <div class="menu-dropdown">
                    <button onclick="editPost(${post.id})">수정</button>
                    <button onclick="deletePost(${post.id})">삭제</button>
                </div>
            </div>
        </div>
        <p>${post.content}</p>
        <button class="comment-btn" onclick="toggleComments(${post.id})">댓글 보기</button>
        <div class="comment-section" id="comments-${post.id}"></div>
    `;
    postList.appendChild(postElement);

    const menuBtn = postElement.querySelector(".menu-btn");
    menuBtn.addEventListener("click", () => {
        postElement.querySelector(".menu-container").classList.toggle("active");
    });
}

function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    section.style.display = section.style.display === "block" ? "none" : "block";
}

async function deletePost(postId) {
    await fetch(`${API_URL}/posts/${postId}`, { method: "DELETE" });
    fetchPosts(1);
}

async function editPost(postId) {
    const newTitle = prompt("새 제목을 입력하세요:");
    const newContent = prompt("새 내용을 입력하세요:");
    await fetch(`${API_URL}/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent }),
    });
    fetchPosts(1);
}

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
