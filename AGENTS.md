# 项目限制
1. 旅游规划范围仅限定于马来西亚
2. 轻量级网站
3. 在不违反Layer Architecture原则情况下，前端能实现的功能绝不交给后端

# 各Layer
- Presentation Layer: @/app/
- Business Logic Layer: @/business_logic_layer/
- Data Access layer: @/data_access_layer/
- API Layer: @/api_layer/

# 备注
1. API Layer 指与外部API沟通，不是Route API
2. 不确定的事项请先询问我
3. 如果需要使用开发环境，在项目目录下运行devcontainer exec --workspace-folder . <command>
4. 使用npm run preview而不是npm run build|dev
5. 谨慎使用sudo|root权限

1. Travel planning scope is strictly limited to Malaysia
2. Lightweight website
3. APIs must be free, with no credit card required
4. Without violating Layer Architecture principles, functionality that can be implemented on the frontend must never be passed to the backend

# Layers

* Presentation Layer: @/app/
* Business Logic Layer: @/business_logic_layer/
* Data Access layer: @/data_access_layer/
* API Layer: @/api_layer/

# Remarks

1. API Layer refers to communicating with external APIs, not Route APIs
2. For uncertain matters, please ask me first
3. Your module is 02

# Things You Can Do

1. If necessary, you may invoke Sub-Agents to help you complete tasks

# Strictly Forbidden

1. Modifying the development environment
2. Installing additional dependency libraries
3. Modifying the other modules file