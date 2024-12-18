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
        fetchPosts(1);
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

// 게시글 추가
newPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();

    if (!title || !content) {
        alert("제목과 내용을 입력해주세요.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content, author: currentUser.username }),
        });
        if (response.ok) {
            fetchPosts(1);
            newPostForm.reset();
            alert("게시글이 추가되었습니다.");
        }
    } catch (error) {
        console.error("게시글 추가 중 오류:", error);
    }
});

// 게시글 불러오기
async function fetchPosts(page) {
    const offset = (page - 1) * postsPerPage;
    try {
        const response = await fetch(`${API_URL}/posts?limit=${postsPerPage}&offset=${offset}`);
        if (response.ok) {
            const data = await response.json();
            renderPosts(data.posts);
            renderPagination(data.total, page);
        }
    } catch (error) {
        console.error("게시글 불러오기 실패:", error);
    }
}

// 게시글 렌더링
function renderPosts(posts) {
    postList.innerHTML = "";
    posts.forEach((post) => {
        const postElement = document.createElement("div");
        postElement.className = "post";
        postElement.innerHTML = `
            <div class="post-header">
                <h3>${post.title}</h3>
                ${
                    canEditDelete(post.author)
                        ? `<div class="menu-container">
                            <button class="menu-btn">⋮</button>
                            <div class="menu-dropdown hidden">
                                <button onclick="editPost(${post.id})">수정</button>
                                <button onclick="deletePost(${post.id})">삭제</button>
                            </div>
                        </div>`
                        : ""
                }
            </div>
            <p>${post.content}</p>
            <button class="comment-btn" onclick="toggleCommentSection(${post.id})">댓글 보기</button>
            <div id="comments-${post.id}" class="comment-section hidden"></div>
        `;
        postList.appendChild(postElement);
    });

    setupMenuEvents();
}

// 메뉴 이벤트 설정
function setupMenuEvents() {
    document.querySelectorAll(".menu-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // 이벤트 전파 방지
            
            // 현재 버튼의 드롭다운 메뉴 가져오기
            const dropdown = btn.nextElementSibling;

            // 모든 드롭다운 메뉴를 숨기고 현재 클릭된 메뉴만 표시
            document.querySelectorAll(".menu-dropdown").forEach((menu) => {
                if (menu !== dropdown) {
                    menu.classList.add("hidden");
                }
            });

            // 현재 클릭된 드롭다운만 표시
            dropdown.classList.toggle("hidden");
        });
    });

    // 화면의 다른 곳 클릭 시 모든 드롭다운 메뉴 닫기
    document.addEventListener("click", () => {
        document.querySelectorAll(".menu-dropdown").forEach((menu) => {
            menu.classList.add("hidden");
        });
    });
}



// 댓글 토글
function toggleCommentSection(postId) {
    const commentSection = document.getElementById(`comments-${postId}`);
    if (commentSection.classList.contains("hidden")) {
        fetchComments(postId);
        commentSection.classList.remove("hidden");
    } else {
        commentSection.classList.add("hidden");
    }
}

// 댓글 불러오기
async function fetchComments(postId) {
    const commentSection = document.getElementById(`comments-${postId}`);
    commentSection.innerHTML = "댓글을 불러오는 중...";
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments`);
        if (response.ok) {
            const comments = await response.json();
            renderComments(comments, commentSection);
        }
    } catch (error) {
        console.error("댓글 불러오기 실패:", error);
    }
}

// 댓글 렌더링
function renderComments(comments, container) {
    container.innerHTML = "";
    comments.forEach((comment) => {
        const commentDiv = document.createElement("div");
        commentDiv.className = "comment";
        commentDiv.innerHTML = `<p><strong>${comment.author}</strong>: ${comment.content}</p>`;
        container.appendChild(commentDiv);
    });
}

// 권한 확인
function canEditDelete(author) {
    return currentUser && (currentUser.role === "admin" || currentUser.username === author);
}

// 게시글 삭제
async function deletePost(postId) {
    if (confirm("정말 삭제하시겠습니까?")) {
        await fetch(`${API_URL}/posts/${postId}`, { method: "DELETE" });
        fetchPosts(1);
    }
}

// 페이지네이션
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
