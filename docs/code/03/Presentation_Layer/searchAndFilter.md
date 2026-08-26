# searchAndFilter.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/searchAndFilter.tsx`
> - 类型：客户端组件（`"use client"`，搜索与筛选面板，受控组件）

## 责任

`searchAndFilter.tsx` 是模块 03 的搜索与多维筛选面板（Bento 卡片），主页与搜索结果页共用（以受控 props 形式注入状态）。它负责三块 UI：①搜索栏（带真实 Geoapify autocomplete 联想下拉，联想数据经 BL 层 `discoveryService.getSuggestions` 由 Presentation hooks 注入）；②多维筛选下拉（体验类型 / 马来西亚州属，候选项 `filterOptions` 经 hooks 从 BL 层注入，基于 Geoapify category/state 字段的真实数据）；③场景分类标签页（Indoor Venues / Outdoor Scenes / All）。

关键设计：
- **纯受控组件**：所有数据状态（搜索词、筛选值、联想建议）由父级经 props 传入，组件自身仅维护交互局部状态（`isFocused`、`highlightedIndex`），保证主页与搜索页行为一致。
- **交互副作用集中**：`goToSearchPage` 在按 Enter 或点击联想建议时调用 `routes.searchPagePath` 把「搜索词 + 当前全部筛选状态」序列化到 URL 并 `router.push` 跳搜索结果页。
- **联想下拉显隐**：`isFocused && searchQuery.trim().length >= 2 && (suggestions.length > 0 || isSuggesting)`；<2 字符时 hooks 不请求也不清空 state，由本组件长度条件控制下拉显隐。
- **键盘导航**：↑/↓ 循环移动高亮（`highlightedIndex`），Enter 有高亮项时选中建议、无建议时直接搜索，Esc 关闭下拉；`onBlur` 延迟 120ms 关闭以允许建议项 click 先触发；建议项 `onMouseDown` `preventDefault()` 阻止 input blur 抢跑。
- 注：Recommended Places（官方品质评级）与搜索栏完全解绑、独立展示，不在筛选维度内（见 BL 层 `getQualityRatedPois`）。

## 分层数据流

```
SearchAndFilter（本组件，受控纯展示）
  状态注入（父级）：筛选/搜索状态 ← useSearchAndFilter hooks ← discoveryService（BL 层）
  联想数据：suggestions / isSuggesting ← hooks ← discoveryService.getSuggestions
            → Route API /03_Destination_Discovery_&_Inspiration/api/geocode?type=autocomplete → Geoapify
  跳转副作用：goToSearchPage → routes.searchPagePath(q, filters) → router.push（搜索结果页）
```
本组件自身不发起任何数据请求，所有数据经 props 由父级注入。

## 交互事件清单

| 事件 | 触发条件 | 行为 |
| --- | --- | --- |
| 输入 `onChange` | 用户输入 | `setSearchQuery(value)` + 重置 `highlightedIndex = -1` |
| `onFocus` / `onBlur` | 焦点进出 | 开 / 延迟 120ms 关 `isFocused`（延迟保证建议项 click 先触发） |
| `ArrowDown` / `ArrowUp` | 有建议时 | 循环移动 `highlightedIndex` |
| `Enter` | 有高亮建议 | `preventDefault` + `handleSelectSuggestion` |
| `Enter` | 无高亮建议 | `preventDefault` + `goToSearchPage(searchQuery)` |
| `Escape` | 下拉打开 | 关下拉 + 重置高亮 |
| 建议项 `onMouseDown` | 点击建议 | `preventDefault()`（阻止 input blur 抢跑） |
| 建议项 `onClick` | 点击建议 | `handleSelectSuggestion`（回填 + 跳转） |
| 场景标签点击 | 点击 Indoor/Outdoor/All | `setActiveTab(...)` |
| 筛选下拉 `onChange` | 选择体验类型/州属 | `setSelectedExperienceType` / `setSelectedState` |

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| 输入 <2 字符 | 不显示联想下拉（hooks 也不请求） |
| 联想请求进行中 | 下拉显示「Searching…」（`isSuggesting`） |
| 联想为空 | `suggestions.length === 0` 且非加载时不显示下拉 |
| 联想请求失败 | hooks 清空建议（不打扰用户），搜索仍可正常提交 |
| 输入框失焦 | 延迟 120ms 关闭下拉（保证建议项 click 先触发） |
| 空搜索词 Enter | `goToSearchPage` 直接返回（不跳转） |
| 键盘导航无建议 | ↑/↓ 被忽略（`suggestions.length === 0` 提前 return） |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./routes`（`searchPagePath`） | 搜索结果页路径构造（携带筛选参数） |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | `activeType`、`FilterOptions`、`SuggestionItem`（仅记录 import，未打开源文件） |
| 外部库：`react`（`useState`）、`next/navigation`（`useRouter`） | 本地交互状态与路由跳转 |

## 导出与函数明细

### `SearchAndFilterProps`（接口）
- 类型：常量（TypeScript 接口）
- 内容（受控组件 props）：
  - `activeTab: activeType` / `setActiveTab: React.Dispatch<React.SetStateAction<activeType>>` —— 场景标签（indoor/outdoor/all）；
  - `searchQuery: string` / `setSearchQuery` —— 搜索词；
  - `suggestions: SuggestionItem[]` —— 联想建议列表（真实 Geoapify autocomplete 结果）；
  - `isSuggesting: boolean` —— 联想请求进行中；
  - `onSelectSuggestion: (suggestion: SuggestionItem) => void` —— 选中建议回调（回填搜索框并触发真实搜索）；
  - `selectedExperienceType: string` / `setSelectedExperienceType` —— 体验类型筛选；
  - `selectedState: string` / `setSelectedState` —— 州属筛选；
  - `filterOptions: FilterOptions` —— 筛选面板候选项（`{ experienceTypes, states }`）。

### `SearchAndFilter`（默认导出）
- 类型：React 组件（受控组件）
- 传入：`SearchAndFilterProps`（见上）
- 传出：渲染 Bento 卡片（`<section className="relative z-50 rounded-3xl border border-gray-200 bg-white p-6 ...">`）：
  - 搜索栏行：放大镜 SVG 图标 + 输入框（`placeholder="Search destinations, landmarks, or themes..."`，`onFocus`/`onBlur`/`onKeyDown`/`onChange` 绑定）+ 联想下拉（`showDropdown` 时渲染 `<ul>`：isSuggesting 时显示「Searching…」，否则渲染建议项列表，每项含高亮指示条、名称、`line-clamp-1` 的格式化地址）；
  - 筛选面板行：两个 `<select>`（Experience Type / State / Region，选项来自 `filterOptions`，首项为空占位）；
  - 场景标签页行：Indoor Venues / Outdoor Scenes / All 三个胶囊按钮（激活态 `bg-primary-500 text-white`）。
- 用处（交互逻辑）：
  - 本地状态：`isFocused`（焦点）、`highlightedIndex`（键盘高亮，默认 -1）。
  - `goToSearchPage(query)`：`query.trim()` 为空直接返回；`setIsFocused(false)` + `setHighlightedIndex(-1)` 后 `router.push(searchPagePath(q, { experienceType: selectedExperienceType || undefined, scene: activeTab, state: selectedState || undefined }))`——跳转携带全部当前筛选状态（Enter / 点击联想建议触发）。
  - `handleSelectSuggestion(suggestion)`：先 `onSelectSuggestion(suggestion)`（hooks 的 `selectSuggestion` 回填搜索框并清建议）再 `goToSearchPage(suggestion.name)`。
  - `handleInputKeyDown(e)`：`ArrowDown` → 高亮 `(i+1) % length`（无建议忽略）；`ArrowUp` → 高亮 `(i-1+length) % length`；`Enter` 且有高亮项 → `preventDefault` + 选中该建议；`Enter` 无高亮 → `preventDefault` + `goToSearchPage(searchQuery)`；`Escape` → 关闭下拉并重置高亮。
  - 输入框 `onChange`：`setSearchQuery(e.target.value)` + `setHighlightedIndex(-1)`；`onBlur`：`setTimeout(120ms)` 后关闭焦点与高亮。
  - 联想项按钮：`onMouseDown` `preventDefault()`（阻止 blur 抢跑），`onClick` 触发 `handleSelectSuggestion`；高亮项 / hover 项显示主题色指示条（`opacity-100`/`group-hover:opacity-100`）。
