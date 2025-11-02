# import ollama

# if __name__ == "__main__":
#     print(ollama.list())


from ollama import chat

stream = chat(
    model="qwen3",
    messages=[{"role": "user", "content": "17 × 23 等于多少"}],
    stream=True,
)

in_thinking = False
content = ""
thinking = ""
for chunk in stream:
    if chunk.message.thinking:
        if not in_thinking:
            in_thinking = True
            print("Thinking:\n", end="", flush=True)
        print(chunk.message.thinking, end="", flush=True)
        # accumulate the partial thinking
        thinking += chunk.message.thinking
    elif chunk.message.content:
        if in_thinking:
            in_thinking = False
            print("\n\nAnswer:\n", end="", flush=True)
        print(chunk.message.content, end="", flush=True)
        # accumulate the partial content
        content += chunk.message.content

# 修正后的消息格式
new_messages = [{"role": "assistant", "content": content}]
# 如果有thinking内容，可以这样保存
if thinking:
    # 注意：不是所有模型API都支持thinking字段在消息中
    # 通常thinking是中间过程，最终只保存content
    print(f"\n\nThinking was: {thinking}")
