const API_URL = "https://cheongsongdae.onrender.com";

const users = [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "user1", password: "user123", role: "user" },
    { username: "94001", password: "94001", role: "user" },
];

const loginSection = document.getElementById("loginSection");
const boardSection = document.getElementById("boardSection");
const userRoleSpan = document.getElementById("userRole");
const newPostForm = document.getElementById("newPostForm");
const logoutButton = document.getElementById("logoutButton");
const postList = document.getElementById("postList");
const paginationContainer = document.getElementById("pagination");

let currentUser = null;
let postsPerPage = 10;

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

function renderPosts(posts) {
    postList.innerHTML = "";

    // 최신 게시글이 위로 오도록 역순 정렬
    posts.reverse().forEach((post) => {
        const postElement = document.createElement("div");
        postElement.className = "post";
        postElement.setAttribute("data-post-id", post.id); // 게시글 ID 속성 추가
        postElement.setAttribute("data-post", JSON.stringify(post)); // 게시글 데이터 저장

        postElement.innerHTML = `
            <div class="post-header">
                <h3>${post.title}</h3>
                ${
                    canEditDelete(post.author)
                        ? `<div class="menu-container">
                            <button class="menu-btn">⋮</button>
                            <div class="menu-dropdown hidden">
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

    setupMenuEvents(); // 이벤트 리스너 설정
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
    
    if (!commentSection) {
        console.error(`댓글 섹션을 찾을 수 없습니다: postId = ${postId}`);
        return;
    }
    
    if (commentSection.classList.contains("hidden")) {
        // 댓글 섹션 열기
        commentSection.classList.remove("hidden");

        // 댓글 입력창 및 기본 메시지 추가
        if (!commentSection.hasChildNodes()) {
            commentSection.innerHTML = `
                <div class="comment-input">
                    <input type="text" id="comment-input-${postId}" placeholder="댓글을 입력하세요..." />
                    <button class="comment-submit-btn" onclick="addComment(${postId})">댓글 등록</button>
                </div>
                <div id="comment-list-${postId}" class="comment-list">
                    <p class="no-comments">댓글이 없습니다.</p>
                </div>
            `;
        }

        // 댓글 데이터 로드
        fetchComments(postId);
    } else {
        // 댓글 섹션 닫기
        commentSection.classList.add("hidden");
    }
}





// 댓글 불러오기
async function fetchComments(postId) {
    const commentList = document.getElementById(`comment-list-${postId}`);
    commentList.innerHTML = "<p>댓글을 불러오는 중...</p>";

    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments`);
        if (response.ok) {
            const comments = await response.json();
            renderComments(comments, commentList, postId);
        } else {
            commentList.innerHTML = "<p>댓글을 불러오지 못했습니다.</p>";
        }
    } catch (error) {
        console.error("댓글 불러오기 오류:", error);
        commentList.innerHTML = "<p>댓글을 불러오는 중 오류가 발생했습니다.</p>";
    }
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const commentText = input.value.trim();

    if (!commentText) {
        alert("댓글 내용을 입력하세요.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: commentText, author: currentUser.username }),
        });

        if (response.ok) {
            input.value = ""; // 입력창 초기화
            fetchComments(postId); // 댓글 목록 새로고침
        } else {
            alert("댓글 등록 실패");
        }
    } catch (error) {
        console.error("댓글 등록 중 오류:", error);
    }
}



// 댓글 렌더링


function renderComments(comments, container, postId) {
    container.innerHTML = ""; // 기존 댓글 초기화

    if (!comments.length) {
        container.innerHTML = "<p class='no-comments'>댓글이 없습니다.</p>";
        return;
    }

    comments.forEach((comment) => {
        const commentElement = document.createElement("div");
        commentElement.className = "comment";
        commentElement.innerHTML = `
            <p>${comment.content}</p>
            ${
                canEditDelete(comment.author)
                    ? `<button class="comment-delete-btn" onclick="deleteComment(${postId}, ${comment.id})">삭제</button>`
                    : ""
            }
        `;
        container.appendChild(commentElement);
    });
}


async function deleteComment(postId, commentId) {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;

    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}`, {
            method: "DELETE",
        });

        if (response.ok) {
            alert("댓글이 삭제되었습니다.");
            fetchComments(postId); // 댓글 새로고침
        } else {
            alert("댓글 삭제에 실패했습니다.");
        }
    } catch (error) {
        console.error("댓글 삭제 중 오류:", error);
        alert("댓글 삭제 중 오류가 발생했습니다.");
    }
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


//게시글수정
function editPost(postId) {
    // 게시글 엘리먼트를 ID 기반으로 찾음
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) {
        alert("게시글을 찾을 수 없습니다.");
        return;
    }

    // 게시글 데이터를 가져옴
    const post = JSON.parse(postElement.getAttribute("data-post"));

    // 수정 UI 생성
    postElement.innerHTML = `
        <div class="edit-post">
            <input type="text" id="edit-title-${postId}" value="${post.title}" placeholder="제목" />
            <textarea id="edit-content-${postId}" rows="4">${post.content}</textarea>
            <button onclick="saveEditPost(${postId})">저장</button>
            <button onclick="cancelEditPost(${postId})">취소</button>
        </div>
    `;
}



// 수정 내용 저장
async function saveEditPost(postId) {
    const newTitle = document.getElementById(`edit-title-${postId}`).value.trim();
    const newContent = document.getElementById(`edit-content-${postId}`).value.trim();

    if (!newTitle || !newContent) {
        alert("제목과 내용을 입력해주세요.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/update/${postId}`, {
            method: "POST", // POST로 변경
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle, content: newContent }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("서버 오류 메시지:", errorData);
            throw new Error("게시글 수정 실패");
        }

        alert("게시글이 수정되었습니다.");
        fetchPosts(1); // 게시글 다시 불러오기
    } catch (error) {
        console.error("게시글 수정 저장 중 오류:", error);
        alert("게시글을 저장하는 중 오류가 발생했습니다.");
    }
}




// 수정 취소
function cancelEditPost(postId) {
    fetchPosts(1); // 게시글 새로고침
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
