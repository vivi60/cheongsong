from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
import os # 절대 경로 설정을 위해 추가

# 지속 가능한 디렉토리 설정
DB_DIR = "/opt/render/project/src/db"
os.makedirs(DB_DIR, exist_ok=True)  # 디렉토리 생성
DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'community.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI()

# CORS 설정 (프론트엔드와 연결을 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://cheongsongdae.onrender.com"],  # 허용 도메인
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# 정적 파일 서빙 설정 (CSS 및 JS 제공)
app.mount("/static", StaticFiles(directory="static"), name="static")

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
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author = Column(String(50), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    post = relationship("Post", back_populates="comments")

# 데이터베이스 초기화
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error creating tables: {e}")

init_db()

# Pydantic 스키마
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
    db_comments = db.query(Comment).filter(Comment.post_id == post_id).all()
    return db_comments

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
