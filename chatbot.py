import requests
import json
import time
from api_key import key

context = dict()


def get_deepseek_response(message):
    custom_prompt = """
                            你是一个名为FocusFlow的智能学习辅助系统，专门帮助学习者高效理解并掌握知识。你的核心任务是结合用户提供的网页内容和具体问题，通过总结、分析、拓展等方式辅助学习，确保信息准确、易懂且实用。

                        # 核心功能
                        1. 内容解析与总结
                        - 基于给定的网页内容，提取关键信息，用简洁的语言归纳核心观点。
                        - 若用户提出问题，直接针对问题解答，避免泛泛而谈。

                        2. 知识拓展与深化
                        - 在用户理解网页内容的基础上，适当补充关联知识（如背景、案例、对比分析等），确保拓展内容与主题强相关。
                        - 拓展时标注来源或说明逻辑（例如："根据XX理论..."或"举个例子..."），增强可信度。

                        # 输出要求
                        1. 语言风格：严谨清晰、通俗易懂，避免冗长或复杂术语。
                        2. 内容聚焦：
                        - 基于提供的网页内容展开，不要脱离原文。
                        - 可适当进行拓展，拓展部分不超过总篇幅的30%，避免喧宾夺主。
                        3. 格式与长度：
                        - 分点或分段表述，逻辑层级分明。
                        - 严格控制在400字以内，优先输出高价值信息。
                        - 末尾请输出：学长，请和我一起专注吧！。
                    """

    # API端点 - 请根据DeepSeek的实际API文档调整
    deepseek_api_url = "https://api.deepseek.com/v1/chat/completions"
    siliconflow_api_url = "https://api.siliconflow.cn/v1/chat/completions"

    deepseek_api_key = key
    siliconflow_api_key = ""  # TODO 运行时记得要填

    # 请求头
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {deepseek_api_key}",
    }

    # 构造请求数据
    data = {"model": "deepseek-chat", "messages": []}  # 根据实际情况调整模型名称

    # custom_prompt = ""

    # 添加自定义prompt（系统消息），如果提供的话
    if custom_prompt:
        data["messages"].append({"role": "system", "content": custom_prompt})

    # 添加用户消息
    data["messages"].append({"role": "user", "content": message})

    try:
        start_time = time.time()
        # 发送POST请求
        response = requests.post(
            deepseek_api_url, headers=headers, data=json.dumps(data)
        )
        response.raise_for_status()  # 检查是否有错误响应

        # 解析响应
        response_data = response.json()
        result = (
            response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        )

        return result

    except requests.exceptions.RequestException as e:
        print(f"请求API时出错: {e}")
        return f"API请求错误: {str(e)}"
    except Exception as e:
        print(f"处理API响应时出错: {e}")
        return f"处理响应时出错: {str(e)}"
    finally:
        print(f"思考耗时：{int(time.time() - start_time)}s", end="\n\n")


# 使用示例
def chatbot(user_question, webpage, uid):

    # 从前端接收的消息
    if not uid in context:
        context[uid] = "New chat"
    user_message = f"""This is a conversation with context. Answer the user's question using the webpage content and prior messages.
                        Webpage Content: ###{webpage}###
                        Previous Conversation:###{context[uid]}###
                        Current User Question:{user_question}
                    """
    result = get_deepseek_response(user_message)
    if context[uid] == "New chat":
        context[uid] = ""
    context[
        uid
    ] += f"User question: ###{user_question}###;\nAI response: ###{result}###;\n"
    return result
    # print("FocusFlow: \n", result)
    # if input("Continue? Y/N: ") == "N":
    #     break
    # context += f"user: {user_question};\nFocusflow: {result}\n"
