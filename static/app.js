
const API_URL = "https://cheongsongdae.onrender.com"; // FastAPI 서버 주소



const users = [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "user", password: "user123", role: "user" }
];

const loginSection = document.getElementById("loginSection");
const boardSection = document.getElementById("boardSection");
const userRoleSpan = document.getElementById("userRole");
const newPostForm = document.getElementById("newPostForm");
const logoutButton = document.getElementById("logoutButton");
const postList = document.getElementById("postList");

let currentUser = null;

// 페이지 로드 시 로그인 상태 확인
window.addEventListener("DOMContentLoaded", () => {
    const storedUser = localStorage.getItem("loggedInUser");

    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        displayBoard();
    } else {
        showLogin(); // 로그인 화면을 기본으로 표시
    }
});

// 로그인 화면 표시
function showLogin() {
    loginSection.style.display = "block";
    boardSection.style.display = "none";
}

// 게시판 화면 표시
function displayBoard() {
    if (currentUser) {
        loginSection.style.display = "none";
        boardSection.style.display = "block";
        userRoleSpan.textContent = currentUser.role === "admin" ? "관리자님" : "익명님";
        fetchPosts();
    } else {
        showLogin();
    }
}



// 로그인 처리
const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", (e) => {
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

// 로그아웃 처리
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    currentUser = null;
    showLogin();
});

// 게시글 추가
newPostForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // 기본 폼 제출 동작 방지

    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();

    if (!currentUser || !title || !content) {
        alert("로그인 상태와 제목 및 내용을 확인해주세요.");
        return;
    }

    try {
        // API 호출
        const response = await fetch(`${API_URL}/posts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title,
                content: content,
                author: currentUser.username // 현재 로그인한 사용자 이름
            })
        });

        // 응답 처리
        if (!response.ok) {
            const errorData = await response.json();
            console.error("게시글 추가 실패:", errorData);
            alert(`게시글 추가 실패: ${errorData.detail || response.statusText}`);
            return;
        }

        const result = await response.json();
        console.log("게시글 추가 성공:", result);

        fetchPosts(); // 게시글 목록 새로고침
        newPostForm.reset(); // 폼 초기화
        alert("게시글이 추가되었습니다.");
    } catch (error) {
        console.error("게시글 추가 중 오류:", error);
        alert("서버와의 통신 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
});


// 게시글 렌더링
function renderPosts(posts) {
    postList.innerHTML = ""; // 게시글 목록 초기화
    posts.forEach((post) => {
        const postElement = document.createElement("div");
        postElement.className = "post";
        postElement.dataset.id = post.id;

        postElement.innerHTML = `
            <div class="post-header">
            <div>
                <h2 class="post-title">${post.title}</h2>
            <div>
                <p class="post-content">${post.content}</p>
            </div>
            <div class="menu">
                ${canEditDelete(post.author) ? `
                <button class="menu-btn">⋮</button>
                <div id="menu-${post.id}" class="menu-dropdown hidden">
                    <button onclick="editPost(${post.id})">수정</button>
                    <button onclick="deletePost(${post.id})">삭제</button>
                </div>
                ` : ""}
            </div>
            <button class="comment-btn" onclick="toggleCommentSection(${post.id})">댓글 보기</button>
            <div id="comments-${post.id}" class="comment-section hidden">
                <input type="text" placeholder="댓글을 입력하세요" onkeydown="addComment(event, ${post.id})">
                <div class="comment-list"></div>
            </div>
        `;

        postList.appendChild(postElement);
        fetchComments(post.id); // 댓글 로드
    });

    setupMenuEvents(); // 메뉴 토글 이벤트 설정
}

// 권한 확인
function canEditDelete(author) {
    return currentUser.role === "admin" || currentUser.username === author;
}

// 메뉴 토글
function setupMenuEvents() {
    document.querySelectorAll(".menu-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation(); // 클릭 이벤트 전파 방지
            const dropdown = button.nextElementSibling;
            dropdown.classList.toggle("hidden");

            // 다른 드롭다운 닫기
            document.querySelectorAll(".menu-dropdown").forEach((menu) => {
                if (menu !== dropdown) {
                    menu.classList.add("hidden");
                }
            });
        });
    });

    // 화면 클릭 시 모든 드롭다운 닫기
    document.addEventListener("click", () => {
        document.querySelectorAll(".menu-dropdown").forEach((menu) => menu.classList.add("hidden"));
    });
}

// 댓글 섹션 토글
function toggleCommentSection(postId) {
    const commentSection = document.getElementById(`comments-${postId}`);
    commentSection.classList.toggle("hidden");
}

// 댓글 가져오기
async function fetchComments(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments`);
        if (response.ok) {
            const comments = await response.json();
            renderComments(comments, postId);
        }
    } catch (error) {
        console.error("댓글 로드 중 오류:", error);
    }
}

// 댓글 렌더링
function renderComments(comments, postId) {
    const commentList = document.querySelector(`#comments-${postId} .comment-list`);
    commentList.innerHTML = ""; // 댓글 초기화

    comments.forEach((comment) => {
        const commentElement = document.createElement("div");
        commentElement.className = "comment";
        commentElement.dataset.id = comment.id;

        commentElement.innerHTML = `
            <div class="comment-content">${comment.content}</div>
            <div class="comment-actions">
                ${canEditDelete(comment.author) ? `
                <button onclick="editComment(${comment.id}, ${postId})">대댓글</button>
                <button onclick="deleteComment(${comment.id}, ${postId})">삭제</button>
                ` : ""}
            </div>
        `;

        commentList.appendChild(commentElement);
    });
}

// 댓글 추가
async function addComment(event, postId) {
    if (event.key === "Enter") {
        const input = event.target;
        const commentText = input.value.trim();

        if (commentText) {
            try {
                const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: commentText, author: currentUser.username })
                });

                if (response.ok) {
                    fetchComments(postId);
                }
            } catch (error) {
                console.error("댓글 추가 중 오류:", error);
            }
        }
        input.value = "";
    }
}

// 댓글 삭제
async function deleteComment(commentId, postId) {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;

    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}`, { method: "DELETE" });

        if (response.ok) {
            fetchComments(postId);
        }
    } catch (error) {
        console.error("댓글 삭제 중 오류:", error);
    }
}

// 대댓글 추가
async function addReply(commentId, postId) {
    const replyText = prompt("대댓글을 입력하세요:");
    if (replyText) {
        try {
            const response = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}/replies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: replyText, author: currentUser.username }) // 필드 이름 수정
            });

            if (response.ok) {
                fetchComments(postId); // 댓글과 대댓글 새로고침
            } else {
                console.error("대댓글 추가 실패:", response.status);
            }
        } catch (error) {
            console.error("대댓글 추가 중 오류:", error);
        }
    }
}


// 댓글 렌더링 수정: 대댓글 포함
function renderComments(comments, postId) {
    const commentList = document.querySelector(`#comments-${postId} .comment-list`);
    commentList.innerHTML = ""; // 댓글 초기화

    comments.forEach((comment) => {
        const commentElement = document.createElement("div");
        commentElement.className = "comment";
        commentElement.dataset.id = comment.id;

        // 대댓글 렌더링 포함
        const repliesHtml = (comment.replies || []).map(reply => `
    <div class="reply">
        <div class="reply-content">${reply.content}</div>
        <div class="reply-actions">
            ${canEditDelete(reply.author) ? `<button onclick="deleteReply('${reply.id}', ${postId}, '${comment.id}')">삭제</button>` : ""}
        </div>
    </div>
`).join("");


        commentElement.innerHTML = `
            <div class="comment-content">${comment.content}</div>
            <div class="comment-actions">
                ${canEditDelete(comment.author) ? `
                <button onclick="addReply('${comment.id}', ${postId})">대댓글 작성</button>
                <button onclick="deleteComment('${comment.id}', ${postId})">삭제</button>
                ` : ""}
            </div>
            <div class="reply-list">${repliesHtml}</div>
        `;

        commentList.appendChild(commentElement);
    });
}

// 대댓글 삭제
async function deleteReply(replyId, postId, commentId) {
    if (confirm("대댓글을 삭제하시겠습니까?")) {
        try {
            const response = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}/replies/${replyId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                fetchComments(postId); // 댓글과 대댓글 새로고침
            } else {
                console.error("대댓글 삭제 실패:", response.status);
                alert("대댓글 삭제에 실패했습니다.");
            }
        } catch (error) {
            console.error("대댓글 삭제 중 오류:", error);
        }
    }
}

// 서버에 대댓글 저장
async function saveReplyToServer(postId, commentId, replyText, replyId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: replyText, author: currentUser.username })
});

        if (!response.ok) {
            console.error("대댓글 저장 실패:", response.status);
            alert("대댓글 저장에 실패했습니다.");
        }
    } catch (error) {
        console.error("대댓글 저장 중 오류:", error);
    }
}


// 게시글 삭제
async function deletePost(postId) {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, { method: "DELETE" });

        if (response.ok) {
            fetchPosts();
        }
    } catch (error) {
        console.error("게시글 삭제 중 오류:", error);
    }
}

// 서버에서 게시글 가져오기
async function fetchPosts(page = 1) {
    const offset = (page - 1) * postsPerPage; // 현재 페이지에 맞는 offset 계산

    try {
        const response = await fetch(`${API_URL}/posts?limit=${postsPerPage}&offset=${offset}`);
        if (response.ok) {
            const data = await response.json();
            renderPosts(data.posts); // 게시글 렌더링
            renderPagination(data.total, page); // 페이지네이션 버튼 렌더링
        }
    } catch (error) {
        console.error("게시글 로드 중 오류 발생:", error);
    }
}

// 위에 함수 동작하게 해주는 어쩌고
function renderPagination(totalPosts, currentPage) {
    const totalPages = Math.ceil(totalPosts / postsPerPage); // 총 페이지 수 계산
    const paginationContainer = document.getElementById("pagination");
    paginationContainer.innerHTML = ""; // 기존 버튼 초기화

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.textContent = i;
        button.className = i === currentPage ? "active" : "";
        button.addEventListener("click", () => {
            fetchPosts(i); // 해당 페이지의 게시글 가져오기
        });
        paginationContainer.appendChild(button);
    }
}


//게시글 수정
async function editPost(postId) {
    const newTitle = prompt("새 제목을 입력하세요:");
    const newContent = prompt("새 내용을 입력하세요:");

    if (!newTitle || !newContent) {
        alert("제목과 내용을 입력해야 합니다.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: newTitle,
                content: newContent,
                author: currentUser.username // 현재 사용자의 이름 전달
            })
        });

        if (response.ok) {
            fetchPosts(); // 게시글 목록 다시 로드
            alert("게시글이 수정되었습니다.");
        } else {
            console.error("게시글 수정 실패:", response.status);
            alert("게시글 수정에 실패했습니다.");
        }
    } catch (error) {
        console.error("게시글 수정 중 오류:", error);
        alert("오류가 발생했습니다. 다시 시도해주세요.");
    }
}
