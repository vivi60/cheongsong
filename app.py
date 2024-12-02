from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

# 데이터베이스 및 모델 관련 설정 생략 (기존 코드 유지)
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
import os # 절대 경로 설정을 위해 추가

# 절대 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'db/community.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI()

# CORS 설정 (프론트엔드와 연결을 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://cheongsongdae.onrender.com"],  # 모든 도메인 허용 (배포 시에는 특정 도메인만 허용)
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# 정적 파일 서빙 설정 (CSS 및 JS 제공)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.mount("/api", app)

# HTML 파일 제공
@app.get("/", response_class=HTMLResponse)
async def serve_html():
    with open("src/test.html", encoding="utf-8") as html_file:  # UTF-8 인코딩 명시
        return html_file.read()


# 데이터베이스 모델 정의
class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String(50), nullable=False)


# 데이터베이스 초기화
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
except Exception as e:
    print(f"Error creating tables: {e}")



# Pydantic 스키마
class PostCreate(BaseModel):
    title: str
    content: str
    author: str

class PostResponse(PostCreate):
    id: int
    class Config:
        from_attributes = True


# 의존성 주입
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# API 엔드포인트
@app.get("/posts", response_model=list[PostResponse])
def get_posts(db: Session = Depends(get_db)):
    posts = db.query(Post).all()
    return posts

@app.post("/posts", response_model=PostResponse)
def create_post(post: PostCreate, db: Session = Depends(get_db)):
    print(f"Received POST request: {post}")
    try:
        new_post = Post(title=post.title, content=post.content, author=post.author)
        db.add(new_post)
        db.commit()
        db.refresh(new_post)
        print(f"Post created: {new_post}")
        return new_post
    except Exception as e:
        print(f"Error creating post: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating post: {str(e)}")


@app.put("/posts/{post_id}", response_model=PostResponse)
def update_post(post_id: int, post: PostCreate, db: Session = Depends(get_db)):
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    db_post.title = post.title
    db_post.content = post.content
    db_post.author = post.author
    db.commit()
    db.refresh(db_post)
    return db_post

@app.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(db_post)
    db.commit()
    return {"message": "Post deleted successfully"}

from fastapi import FastAPI, HTTPException, Path
from pydantic import BaseModel
from typing import List


# 데이터베이스 시뮬레이션

comments = {
    1: [{"id": 1, "content": "첫 댓글", "author": "user"}],
    2: [{"id": 2, "content": "두 번째 게시글의 댓글", "author": "admin"}],
}

posts = {
    5: {
        "title": "게시글 제목 5",
        "content": "게시글 내용 5",
        "comments": {
            "1": {
                "content": "첫 댓글",
                "author": "user",
                "replies": {}
            }
        }
    }
}


class Comment(BaseModel):
    content: str
    author: str


# 게시글 목록 가져오기
@app.get("/posts")
def get_posts():
    return posts


# 특정 게시글의 댓글 가져오기
@app.get("/posts/{post_id}/comments")
def get_comments(post_id: int = Path(..., description="게시글 ID")):
    if post_id not in comments:
        return []
    return comments[post_id]


# 댓글 추가하기
@app.post("/posts/{post_id}/comments")
def add_comment(post_id: int, comment: Comment):
    if post_id not in comments:
        comments[post_id] = []
    new_comment = {"id": len(comments[post_id]) + 1, **comment.dict()}
    comments[post_id].append(new_comment)
    return new_comment


# 댓글 삭제하기
@app.delete("/posts/{post_id}/comments/{comment_id}")
def delete_comment(post_id: int, comment_id: int):
    if post_id not in comments:
        raise HTTPException(status_code=404, detail="댓글이 없습니다.")
    filtered_comments = [c for c in comments[post_id] if c["id"] != comment_id]
    if len(filtered_comments) == len(comments[post_id]):
        raise HTTPException(status_code=404, detail="해당 댓글을 찾을 수 없습니다.")
    comments[post_id] = filtered_comments
    return {"message": "댓글이 삭제되었습니다."}

# 데이터베이스 시뮬레이션
posts = {
    1: {"title": "Example Post", "content": "Hello World!", "comments": {
        "1": {"content": "첫 댓글", "author": "user", "replies": {}}
    }},
}

class Reply(BaseModel):
    text: str
    author: str

# 대댓글 추가
@app.post("/posts/{post_id}/comments/{comment_id}/replies")
async def add_reply(post_id: int, comment_id: str, reply: Reply):
    if post_id not in posts:
        raise HTTPException(status_code=404, detail=f"Post {post_id} not found")
    if comment_id not in posts[post_id]["comments"]:
        raise HTTPException(status_code=404, detail=f"Comment {comment_id} not found")

    reply_id = f"reply-{len(posts[post_id]['comments'][comment_id]['replies']) + 1}"
    posts[post_id]["comments"][comment_id]["replies"][reply_id] = {
        "text": reply.text,
        "author": reply.author
    }
    return {"message": "Reply added successfully", "id": reply_id}



# 대댓글 삭제
@app.delete("/posts/{post_id}/comments/{comment_id}/replies/{reply_id}")
async def delete_reply(post_id: int, comment_id: str, reply_id: str):
    if post_id not in posts:
        raise HTTPException(status_code=404, detail="Post not found")
    if comment_id not in posts[post_id]["comments"]:
        raise HTTPException(status_code=404, detail="Comment not found")
    if reply_id not in posts[post_id]["comments"][comment_id]["replies"]:
        raise HTTPException(status_code=404, detail="Reply not found")

    del posts[post_id]["comments"][comment_id]["replies"][reply_id]
    return {"message": "Reply deleted successfully"}
