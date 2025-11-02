from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 配置跨域，允许前端本地调试
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源，生产环境需指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 固定返回的JSON数据
FIXED_RESPONSE = {
    "message": "用户输入的消息",
    "systemPrompt": "选择的对话风格提示词",
    "history": [
        {"role": "user", "content": "历史消息1"},
        {"role": "assistant", "content": "历史消息2"},
    ],
}


@app.post("/chat")
async def chat():
    """接收聊天请求并返回固定的JSON响应"""
    return FIXED_RESPONSE


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
