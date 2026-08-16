# 项目限制
1. 旅游规划范围仅限定于马来西亚
2. 轻量级网站
3. API必须免费，无需信用卡
4. 在不违反Layer Architecture原则情况下，前端能实现的功能绝不交给后端

# 各Layer
- Presentation Layer: @/app/
- Business Logic Layer: @/business_logic_layer/
- Data Access layer: @/data_access_layer/
- API Layer: @/api_layer/

# 备注
1. API Layer 指与外部API沟通，不是Route API
2. 不确定的事项请先询问我
3. 如果需要编译，使用docker exec -it competent_meninsky <command>
4. 使用npm run preview而不是npm run build|dev
5. 谨慎使用sudo|root权限

# 可以做的事
1. 如有必要，你可以调用Sub-Agent来帮助你完成任务

# 绝对禁止
1. 修改开发环境
2. 加装依赖库