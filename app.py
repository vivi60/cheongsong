from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
import os  # 절대 경로 설정을 위해 추가

# 지속 가능한 디렉토리 설정
DB_DIR = "/data/db"
os.makedirs(DB_DIR, exist_ok=True)  # 디렉터리 생성 (이미 존재하면 무시)
DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'community.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://cheongsongdae.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙 설정
app.mount("/static", StaticFiles(directory="static"), name="static")

# HTML 파일 제공
@app.get("/", response_class=HTMLResponse)
async def serve_html():
    with open("src/test.html", encoding="utf-8") as html_file:
        return html_file.read()


# 데이터베이스 모델 정의
class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String(50), nullable=False)
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author = Column(String(50), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    post = relationship("Post", back_populates="comments")
    replies = relationship("Reply", back_populates="comment", cascade="all, delete-orphan")

class Reply(Base):
    __tablename__ = "replies"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author = Column(String(50), nullable=False)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=False)
    comment = relationship("Comment", back_populates="replies")

# 데이터베이스 테이블 존재 여부 및 초기화
@app.on_event("startup")
async def startup_event():
    print(f"Using database file at: {DATABASE_URL}")
    try:
        # 테이블 존재 여부를 SQL로 직접 확인
        with engine.connect() as connection:
            result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='posts';"))
            if result.fetchone() is None:  # 테이블이 없으면 생성
                Base.metadata.create_all(bind=engine)
                print("Created missing tables.")
            else:
                print("All required tables already exist.")
    except Exception as e:
        print(f"Error during startup table check: {e}")

        
# Pydantic 스키마 정의
class PostCreate(BaseModel):
    title: str
    content: str
    author: str

class PostResponse(PostCreate):
    id: int
    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    content: str
    author: str

class CommentResponse(CommentCreate):
    id: int
    post_id: int
    class Config:
        from_attributes = True

class ReplyCreate(BaseModel):
    content: str
    author: str

    @classmethod
    def validate(cls, data):
        if not data.get("content") or not data.get("author"):
            raise ValueError("Both content and author are required fields.")
        return cls(**data)

    def __init__(self, **data):
        if not data.get("content") or not data.get("author"):
            raise ValueError("Both content and author are required for a reply.")
        super().__init__(**data)

class ReplyResponse(ReplyCreate):
    id: int
    comment_id: int
    class Config:
        from_attributes = True

# 의존성 주입
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API 구현
@app.get("/posts", response_model=list[PostResponse])
def get_posts(db: Session = Depends(get_db)):
    return db.query(Post).all()

@app.post("/posts", response_model=PostResponse)
def create_post(post: PostCreate, db: Session = Depends(get_db)):
    new_post = Post(**post.dict())
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@app.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(db_post)
    db.commit()
    return {"message": "Post deleted successfully"}

@app.get("/posts/{post_id}/comments", response_model=list[CommentResponse])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    return db.query(Comment).filter(Comment.post_id == post_id).all()

@app.post("/posts/{post_id}/comments", response_model=CommentResponse)
def add_comment(post_id: int, comment: CommentCreate, db: Session = Depends(get_db)):
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    new_comment = Comment(content=comment.content, author=comment.author, post_id=post_id)
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

@app.delete("/posts/{post_id}/comments/{comment_id}")
def delete_comment(post_id: int, comment_id: int, db: Session = Depends(get_db)):
    db_comment = db.query(Comment).filter(Comment.id == comment_id, Comment.post_id == post_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(db_comment)
    db.commit()
    return {"message": "Comment deleted successfully"}

@app.get("/posts/{post_id}/comments/{comment_id}/replies", response_model=list[ReplyResponse])
def get_replies(post_id: int, comment_id: int, db: Session = Depends(get_db)):
    return db.query(Reply).filter(Reply.comment_id == comment_id).all()

@app.post("/posts/{post_id}/comments/{comment_id}/replies", response_model=ReplyResponse)
def add_reply(post_id: int, comment_id: int, reply: ReplyCreate, db: Session = Depends(get_db)):
    print(f"Received data: post_id={post_id}, comment_id={comment_id}, reply={reply}")
    db_comment = db.query(Comment).filter(Comment.id == comment_id, Comment.post_id == post_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    new_reply = Reply(content=reply.content, author=reply.author, comment_id=comment_id)
    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)
    return new_reply

@app.delete("/posts/{post_id}/comments/{comment_id}/replies/{reply_id}")
def delete_reply(post_id: int, comment_id: int, reply_id: int, db: Session = Depends(get_db)):
    db_reply = db.query(Reply).filter(Reply.id == reply_id, Reply.comment_id == comment_id).first()
    if not db_reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    db.delete(db_reply)
    db.commit()
    return {"message": "Reply deleted successfully"}

# 데이터베이스 파일 다운로드 API
from fastapi.responses import FileResponse

@app.get("/download-db")
def download_db():
    db_path = "/opt/render/project/src/db/community.db"
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Database file not found")
    return FileResponse(db_path, filename="community.db")
