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

    // 메뉴 버튼 클릭 이벤트 설정
    const menuBtn = postElement.querySelector(".menu-btn");
    const menuContainer = postElement.querySelector(".menu-container");
    menuBtn.addEventListener("click", (event) => {
        event.stopPropagation(); // 클릭 이벤트 전파 방지
        document.querySelectorAll(".menu-container").forEach((container) => {
            if (container !== menuContainer) container.classList.remove("active");
        });
        menuContainer.classList.toggle("active");
    });

    // 화면의 다른 곳 클릭 시 메뉴 닫기
    document.addEventListener("click", () => {
        menuContainer.classList.remove("active");
    });
}

function toggleComments(postId) {
    const commentSection = document.getElementById(`comments-${postId}`);

    if (!commentSection.classList.contains("active")) {
        // 댓글 입력창과 댓글 목록을 초기화 및 생성
        commentSection.innerHTML = `
            <div class="comment-input">
                <input type="text" id="comment-input-${postId}" placeholder="댓글을 입력하세요..." />
                <button class="comment-submit-btn" onclick="addComment(${postId})">댓글 등록</button>
            </div>
            <div id="comment-list-${postId}" class="comment-list"></div>
        `;
        commentSection.classList.add("active");
        fetchComments(postId); // 댓글 불러오기
    } else {
        // 댓글 영역 닫기
        commentSection.innerHTML = "";
        commentSection.classList.remove("active");
    }
}






async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const commentText = input.value.trim();

    if (!commentText) {
        alert("댓글을 입력해주세요.");
        return;
    }

    try {
        await fetch(`${API_URL}/posts/${postId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: commentText, author: currentUser.username }),
        });

        // 댓글 새로고침
        fetchComments(postId);
        input.value = ""; // 입력 필드 초기화
    } catch (error) {
        console.error("댓글 등록 실패:", error);
        alert("댓글 등록 중 오류가 발생했습니다.");
    }
}





async function fetchComments(postId) {
    const commentList = document.getElementById(`comment-list-${postId}`);
    commentList.innerHTML = "댓글을 불러오는 중...";

    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments`);
        if (response.ok) {
            const comments = await response.json();
            renderComments(comments, commentList);
        } else {
            commentList.innerHTML = "댓글을 불러오는 데 실패했습니다.";
        }
    } catch (error) {
        console.error("댓글 불러오기 실패:", error);
        commentList.innerHTML = "서버 오류가 발생했습니다.";
    }
}





function renderComments(comments, container) {
    container.innerHTML = ""; // 기존 댓글 초기화

    if (comments.length === 0) {
        container.innerHTML = "<p>댓글이 없습니다.</p>";
        return;
    }

    comments.forEach(comment => {
        const commentElement = document.createElement("div");
        commentElement.className = "comment";
        commentElement.innerHTML = `
            <p><strong>${comment.author}</strong>: ${comment.content}</p>
        `;
        container.appendChild(commentElement);
    });
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
