from __future__ import annotations

import ollama
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="AI聊天后端（基于ollama-python）")


# 数据模型定义
class ChatRequest(BaseModel):
    model: str
    message: str
    history: list[dict[str, str]] | None = (
        None  # 聊天历史，格式: [{"role": "user", "content": "..."}]
    )


class ModelResponse(BaseModel):
    models: list[str]


class ChatResponse(BaseModel):
    response: str
    model: str


# 获取可用模型列表
@app.get(
    "/models", response_model=ModelResponse, description="获取Ollama中已下载的模型列表"
)
def get_models():
    try:
        # 调用ollama.list()获取模型列表
        models = ollama.list()
        # 提取模型名称
        model_names = [
            model["model"] for model in models.get("models", [])
        ]
        return {"models": model_names}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模型列表失败: {str(e)}")


# 聊天接口
@app.post(
    "/chat", response_model=ChatResponse, description="与指定模型进行聊天（带上下文）"
)
def chat(chat_request: ChatRequest):
    try:
        # 构建对话历史（包含上下文）
        messages = []
        if chat_request.history:
            messages.extend(chat_request.history)

        # 添加当前用户消息
        messages.append({"role": "user", "content": chat_request.message})

        # 调用ollama聊天接口
        response = ollama.chat(
            model=chat_request.model,
            messages=messages,
            stream=False,  # 非流式响应（简单场景）
        )

        # 提取助手回复
        assistant_response = response["message"]["content"]
        return {"response": assistant_response, "model": chat_request.model}
    except ollama.ResponseError as e:
        # 处理模型不存在、请求错误等情况
        raise HTTPException(status_code=400, detail=f"模型请求错误: {e.error}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"聊天处理失败: {str(e)}")


# 启动说明
"""
使用步骤:
1. 确保已安装并启动Ollama服务: https://ollama.com/download
2. 拉取模型（例如）: ollama pull llama3
3. 安装依赖: pip install fastapi uvicorn ollama pydantic
4. 启动服务: uvicorn main:app --reload
5. 访问API文档: http://127.0.0.1:8000/docs

接口说明:
- GET /models: 获取所有已下载的模型（如 llama3、qwen 等）
- POST /chat: 发送聊天请求，示例请求体:
  {
    "model": "llama3",
    "message": "你好，介绍一下自己",
    "history": [
      {"role": "user", "content": "之前的问题"},
      {"role": "assistant", "content": "之前的回答"}
    ]
  }
"""
