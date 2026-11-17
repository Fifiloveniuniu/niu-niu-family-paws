# Making changes to your website

You can ask Codex for changes in everyday English or Simplified Chinese. You do not need to write code, run commands, or manage GitHub yourself.

Open this project in Codex and say:

> Read AGENTS.md and docs/session-handoff.md, then help me update the website. I am the business owner and do not code.

Then describe what you want. For example:

- “Change our contact information to these details: …”
- “Update the daycare description in English and Chinese to say …”
- “The Chinese text is cut off on my phone. Please fix it.”
- “Show me what is already live and what still needs my decision.”

For a problem, describe what you clicked, what happened, and what you expected. A screenshot can help. For prices, services, contact details, package terms, or photos, supply the approved information or assets. Codex must ask about missing business rules rather than make them up.

## What Codex will handle

Codex will read the project instructions, make one complete change at a time, preview visible changes locally, and walk you through the result in the browser. It will test the change, open a GitHub pull request (a reviewable record of the change), and merge it after validation. Your current instruction is to develop locally one feature at a time and publish only once all requested features are complete; Codex will check the live website after that final publication. This workflow is already authorized; routine merges do not need another approval. Necessary account sign-in, business decisions, billing, or mandatory confirmations may still require your help.

Every release must keep English and Simplified Chinese working on phones and computers and preserve existing features. Hosting stays on Google Cloud: Firebase Hosting, Firebase Authentication, Firestore, and Cloud Run for the API.

The live website is https://niu-niu-family-paws.web.app. A local preview is for reviewing changes; ask for the live link when a change is delivered.

## Managing customer contacts

Open the website, choose **Sign in**, and use your authorized administrator Google account. In **Customers**, choose **Add customer**, enter the name, optional contact email/phone, and preferred language, then choose **Save customer**. Choose the pencil icon beside a saved record to edit it in a pop-up. Search using the beginning of the customer's name, contact email, or Google login email; clear the search box and search again to show all records. A Google login email is shown separately and cannot be changed by editing contact details.

中文界面：点击“登录”，使用已获授权的管理员 Google 账号。在“客户”中点击“添加客户”，填写姓名、可选的邮箱和电话及首选语言，再点击“保存客户”。点击记录旁的铅笔图标，在弹窗中修改资料。搜索时输入姓名、联系邮箱或 Google 登录邮箱的开头；清空搜索框后再次搜索可显示所有记录。Google 登录邮箱单独显示，修改联系方式不会改变登录身份。

Adding a customer in the administrator directory saves contact information. It does not create their login, link a Google account, or send an email. Contact email is editable profile information, not verified login identity. Edits keep an audit history; customers and employees cannot open the administrator directory.

## Saving your own profile

Administrators first choose **My profile & pets** in **Workspace**. Choose **Customer management** to return to the directory. Both pages use the same Google login and existing profile/pet records. Switching pages keeps unsaved edits during the current session; reloading the website starts in customer management and asks before discarding unsaved edits. Saving still requires the usual Save buttons. Ordinary customers go straight to their own profile.

管理员先在“切换页面”中选择“我的资料与宠物”，即可管理自己的资料。点击“客户管理”返回客户目录。两页共用同一个 Google 账号和已有资料，不必重复注册。当前会话内切换页面会保留未保存的修改；刷新网站会回到客户管理，并放弃未保存的修改。修改仍需点击相应“保存”按钮才会保存。普通客户登录后直接进入自己的资料。

To change the website language, use **Language / 语言** at the top of any page and choose **English** or **简体中文**. The website remembers your choice in this browser. This changes the interface, without changing the preferred language saved in your profile.

切换网站语言时，在页面顶部的 **Language / 语言** 中选择 **English** 或 **简体中文**。浏览器会记住您的选择。这只会切换界面语言，不会修改个人资料中保存的语言偏好。

Customers sign in with their own Google account, enter **Your name** and **Your preferred language** under **My profile**, then choose **Save profile**. Later they can update these fields and save again. Each Google identity accesses only its own profile. Administrators and staff also have a personal profile panel; it uses the same canonical record across their roles.

客户使用自己的 Google 账号登录，在“我的资料”中填写“您的姓名”和“您的首选语言”，再点击“保存我的资料”。以后可在这里修改并再次保存资料。每个 Google 账号只能访问自己的个人资料；管理员和员工也可填写自己的资料，不必另建账号。

The administrator directory shows these registered profiles automatically. Administrator edits and customer edits refer to the same record. Existing administrator-created records are never automatically linked by matching names/emails. If another edit changes a record first, the app asks you to reload before saving again.

## Linking an existing customer

Before the customer saves a new personal profile, choose the chain-link icon beside their existing customer record to open **Link a Google account**. Generate a code and share it privately with that customer. They sign in with their own Google account, enter the code under **Already registered with us?**, and submit. Open the customer's linking panel and **Check status**. Verify that the displayed Google email belongs to this customer, then choose **Approve account link**. The customer checks status or signs in again to see their original profile and pets. Codes last 24 hours. Replacing a code cancels its earlier request; reject or cancel any incorrect request. The website does not send the code by email.

在客户保存新个人资料前，管理员先在原客户记录旁点击链条图标，打开“关联 Google 账号”弹窗，生成关联码后私下交给客户。客户用自己的 Google 账号登录，在“之前已登记过资料？”中输入关联码并提交。管理员打开该客户的关联页面，点击“查看最新状态”，核实显示的 Google 邮箱确实属于该客户后，再“批准关联”。客户查看最新状态或重新登录，即可看到原资料和宠物。关联码 24 小时内有效；重新生成会使旧码及申请失效。错误申请请拒绝或取消。网站不会自动发送关联邮件。

If the account already saved a separate profile, linking stops to protect both records. Ask for help resolving the duplicate; the website will not automatically merge or move pets. 如果账号已经另存个人资料，系统会停止关联，保护两份资料。请联系管理员处理重复资料；不会自动合并或转移宠物。

## Managing pets

When an action would discard edits, the website asks first. Choose **Cancel** to keep editing, or **OK** to discard and continue. This applies to cancelling/replacing a form, switching to another customer's pets, signing out and returning to the website. Changing the interface language or switching administrator workspaces keeps drafts. Use **Save** to store changes; reminders do not save automatically.

操作会丢失未保存的修改时，网站会先询问。点击“取消”可留下继续编辑，点击“确定”会放弃修改并继续操作。切换界面语言或管理员工作页面会保留草稿。请点击“保存”才会正式保存；提醒不会自动保存。

After saving your profile, use **My pets → Add pet**, enter the pet's name and choose **Save pet**. Add as many separate pets as you need. Photos can be added later: choose the pencil icon on the pet card, select a JPEG, PNG or WebP image (up to 3 MB and 16 megapixels), and save. A newly selected image stays on your device until you save. Only the owner and authorized administrators can view saved photos. The system resizes photos and removes source metadata.

保存个人资料后，在“我的宠物”中点击“添加宠物”，填写名字后点击“保存宠物”。每只宠物单独添加。照片可以以后补：点击宠物卡片上的铅笔图标，在弹窗中选择 JPEG、PNG 或 WebP 图片（最大 3 MB、1600 万像素），再保存。新选的图片只有保存后才会上传。已保存的照片仅主人与获授权的管理员可查看，系统会缩小图片并移除原始元数据。

Administrators click a customer’s name in the left list to see that customer's pets. Open **Find a pet**, then **Search pet names** to find names by their beginning and shows the customer's name/Google email; **Manage these pets** opens all pets belonging to that customer. Edits update the same records the customer sees and keep an audit history. Use the existing customer search for customer names or Google emails. Adding pets does not link an unlinked contact to a Google account.

管理员点击左侧列表中的客户姓名，即可查看和编辑该客户的宠物。展开“查找宠物”，输入宠物名字的开头并点击“搜索宠物名字”，结果会显示宠物归属的客户；点击“管理这些宠物”可打开该客户的全部宠物。按客户姓名或 Google 邮箱查找时，仍使用“搜索客户”。管理员与客户修改同一份资料，修改会保留记录；添加宠物不会自动关联 Google 账号。

## Information still needed

The handoff tracks the latest status. Pending business information includes approved public contact details, service location and timezone, services and rates, package rules, official Chinese business name, photos, and branding. Sign-in email addresses are not automatically approved public contact information.

Service tracking also needs decisions about drop-off/pickup, when units are consumed, partial days, overnight stays, cancellations, expiry, and shared pet balances. Payment history, income reporting, care notes, and a separate attendance page are outside the current agreed scope.

## Continuing on another computer or account

Use the same GitHub project, `Fifiloveniuniu/niu-niu-family-paws`, and ask Codex to read its instructions. The saved guidance travels with the repository; it does not automatically grant access to GitHub, Google Cloud, or administrator accounts. A new environment may need the owner's authorized sign-in. Never paste passwords, private keys, or verification codes into project files.

## Choosing a customer's pets

In **Customer management**, the customer list appears on the left and the selected customer's pets appear on the right. Click a customer’s row to show their pets on the right. Hovering highlights the row; the selected customer has a green background and a left border. Edit customer and account linking remain separate actions. On phones, selecting a customer brings their pets into view below the list. Use **← Customers** to return to the list. Search customers or pet names in the left panel; pet search results can also select a customer. Existing private photos remain visible only to the owner and authorized administrators. Switching customers asks before discarding unsaved pet edits.

在“客户管理”中，左侧显示客户列表，右侧显示所选客户的宠物。点击客户行即可在右侧查看其宠物。鼠标悬停时会高亮；所选客户显示绿色背景和左侧边框。编辑客户和关联账号仍为独立操作。手机上，选择客户后会自动显示下方的宠物区域，点击“← 客户列表”可返回列表。左侧可按客户或宠物名字搜索，宠物搜索结果也可用于选择客户。已保存的照片仍仅供主人和获授权的管理员查看。切换客户前，如有未保存的宠物修改，系统会先询问。

Routine reload buttons are removed. Customers and pets load when you open them, and lists update after saves. If loading fails, use **Try again** beside the error. Account access is rechecked when you return to the tab. Unsaved edits remain protected.

日常页面不再显示重新加载按钮。打开资料时会自动加载，保存后列表会自动更新。加载失败时，点击错误旁的“重试”。返回浏览器标签页时会自动检查登录权限，未保存的修改仍受到保护。

Pet photos load privately from Google Cloud Storage. A pet without a saved photo shows **No photo yet**. Use **Edit pet** to upload its own photo. Test-library photos are separate from real customer photos.

宠物照片从 Google Cloud Storage 私密加载。未保存照片时显示“尚未添加照片”。通过“编辑宠物”上传宠物自己的照片。测试图库与真实客户照片分开存放。

Editing customers and pets, adding them, and linking Google accounts open in focused pop-ups. Use Save to apply changes, Cancel or the × icon to close; unsaved changes ask first. Escape closes the pop-up with the same protection. Icon buttons have tooltips and accessible names. The local browser preview uses **http://localhost:4177**, where Google sign-in works; avoid `127.0.0.1` for real sign-in. Codex runs and manages the dev servers.

添加或编辑客户与宠物、关联 Google 账号时会打开弹窗。点击“保存”应用修改；点击“取消”或 × 关闭，如有未保存修改会先询问。Esc 键也可关闭，并保留同样的保护。图标按钮有提示文字和无障碍名称。本地预览使用 **http://localhost:4177**，支持 Google 登录；真实登录请勿使用 `127.0.0.1`。开发服务器由 Codex 运行和管理。

## Local photo-filled test preview

Codex can open **http://localhost:4180/#/login**, an isolated local test environment with 100 fake families and 300 pets, all with cloud-sourced sample photos. Use the Auth Emulator account `local-admin@example.test`; no real Google password is needed. Search `[TEST / 测试] Family 001` to see a cat, dog, and rabbit. Changes here stay local. The yellow LOCAL TEST banner distinguishes it from the live site. Codex manages the servers and setup.

本地照片测试页面：**http://localhost:4180/#/login**。使用模拟账号 `local-admin@example.test`，不需要真实 Google 密码。搜索 `[TEST / 测试] Family 001`，可查看猫、狗、兔子的示例照片。这里的修改仅保存在本地，不影响线上真实客户。黄色“本地测试”提示可帮助区分环境，服务器由 Codex 管理。

## Managing houses (local development)

Administrators choose **Houses** in Workspace, then **Add house**. Enter the house name, optional address, and its local time zone, then save. Use **Show house** to see all houses or one location; the pencil icon edits it. The site does not publish addresses or invent location details. Rooms/spaces and booking occupancy are separate upcoming features. Changes currently remain in the isolated local preview; deployment is deferred until the requested feature set is complete.

管理员在“切换页面”中选择“房屋”，点击“添加房屋”，填写名称、可选地址和当地时区后保存。通过“显示房屋”选择全部或一处房屋，点击铅笔图标修改资料。这里不会公开地址。房间、空间与预约占用安排将分别完成，目前只在本地测试，所有功能完成后再上线。

## Setting up the house map (local development)

Choose **House map**, then choose a house. The first saved house opens automatically; **All houses** shows the location list and **Open map** opens one location. **Add room** creates a room; **Add space** inside it defines a usable space.

For each space, enter its name, choose the sharing rule, enter capacity, select allowed pet types and optionally set a weight limit in kg or lb. **One pet** sets capacity to one. Tap a space to edit it; the room pencil edits its name or closes the whole room. Closed rooms/spaces are labelled and shaded. These settings are entered by you; sample test values are not your business policy. The map currently configures spaces; timed bookings/occupancy will follow in separate PRs.

选择“房屋地图”并选择房屋，点击“添加房间”，再在房间内“添加空间”。填写名称、共用规则、容量、允许的宠物种类，以及可选体重上限（kg 或 lb）。“单只宠物”会将容量设为 1。点击空间修改规则；房间旁的铅笔可修改名称或关闭整个房间。关闭的区域会有文字标记。目前用于配置空间，预约时段与占用情况将在后续独立功能中完成。

## Current planning focus — 2026-11-15

Calendar and balance management is the next focus on a clean branch. The house/room screen is work in progress. Its latest design is houses/rooms on the left and room capacity on the right; each room holds one species at a time, can change species between non-overlapping stays, and uses group-based pet capacity with individual admin overrides. Earlier individual-space instructions describe a superseded draft. No SWC migration is planned. Changes stay local until the requested features are complete.

## House calendar navigation (local prototype)

Choose **House calendar · Prototype** in Workspace, then **Manage houses & rooms** to open house setup. Add/Edit house use the existing saved house records. Room setup is still being developed; the calendar itself shows labelled example stays. The separate Houses tab is removed from the local preview.

在工作区选择“房屋日历 · 原型”，再点击“管理房屋与房间”打开设置弹窗。添加和编辑房屋使用原有保存的记录。房间设置仍在开发中，日历显示的是已标注的示例托管安排。本地预览不再单独显示“房屋”标签。

## Trying calendar placement (local prototype)

Use the house-plus icon to add a sample house, the plus beside a house to add a room, and the pet-plus icon to add a timed pet stay. Configure the room’s maximum capacity and sample pet-type usage in its gear dialog first. Select pet and arrival/pickup times to see available houses/rooms and explanations for unavailable ones. The × beside a pet removes its placement while keeping the sample pet profile; in-care pets are protected. Empty rooms/houses can be removed in their gear dialogs. All these calendar changes stay on the current page and reset when leaving or reloading. They do not change saved business records.

Customer / House / Room / Pet type / Status / Pet name filters combine. The reset-arrow icon clears them. Day / Weeks / Month / Year are tabs; arrow keys, Home and End switch views. Gear and plus icons have tooltips.

房屋加号用于添加示例房屋，房屋旁的加号添加房间，宠物加号安排托管。请先在房间齿轮弹窗中配置容量和示例种类用量。选择宠物及到店、接回时间后，可查看可选房屋、房间及不可用原因。宠物旁的 × 仅移除安排，不删除示例宠物；在店宠物受保护。空房间和空房屋可在齿轮弹窗移除。日历修改仅保留在当前页面，离开或刷新后重置，不修改正式业务记录。客户、房屋、房间、种类、状态和宠物名字筛选可组合使用，重置箭头清空筛选。日、周、月、年使用标签切换，支持方向键、Home 和 End。

## Choosing a room on the Add pet calendar (prototype)

Choose a pet and enter arrival/pickup. Gray bands show the actual unavailable time ranges for each room; white areas are free. Click Choose room or its green range to use the entered times, or tap a free time to shift the entire entered stay there. Any stay crossing an unavailable period is rejected. Gray bands cannot be selected. Hover for exact unavailable times/reasons. Use the datetime fields or manual selectors for precise keyboard scheduling; dragging is not required. Changes stay in the preview.

选择宠物并填写到店和接回时间。灰色条表示房间的实际不可用时段，白色区域表示空闲。点击“选择房间”或绿色条使用已填写时间，或点击空闲处把整个托管时段移到该开始时间。跨越冲突时段的安排不能提交，灰色条不可选。悬停可查看准确时间与原因。也可以使用日期时间输入框或手动选房，无需拖动。修改仅保留在预览中。

## Pet balances and the new scheduling flow (local preview)

Add pet now guides you through **Stay details → Choose room → Review**. Choose the pet, service, planned times and staff-reviewed required days. Gray room ranges remain unavailable. The review shows this pet’s balance check, required days and planning remainder; missing or insufficient eligible days blocks Add. Open **Add balance / Manage pet balance** from review without losing the stay draft.

Use **Boarding balances** in the calendar header to select a customer, pet for boarding. Set up its sample day credits, reviewed coverage dates. Save a named Policy template to reuse those dates for another pet of the same service, or select Custom dates. Templates do not share balances and reset when leaving/reloading the preview. Each addition/removal of days may include an optional reason and retains an adjustment history. Only boarding is supported; different pets do not share credits. Recorded days / Planned here / Available to plan are planning figures for this page. No real payment, reservation, deduction or package activation is saved. Leaving/reloading this page resets the sample data. Real day-counting and balance lifecycle still need your decisions.

添加宠物分为“托管详情 → 选择房间 → 确认”：选择宠物、服务、时间并填写员工核对的天数。灰色时段不可用。确认页检查该宠物的余额、所需天数和计划后剩余，缺少余额或覆盖不足时不能添加。可直接打开“增加余额 / 管理宠物余额”，托管草稿会保留。日历顶部“寄养余额”可按客户及宠物管理示例天数、核对后的覆盖日期。可保存并选择同一服务的“规则模板”重复使用日期，或使用“自定义日期”；模板不共享余额，离开或刷新预览后重置。增减天数可选填原因，并保留记录；仅支持寄养，宠物之间不混用天数。数字仅用于当前页的计划预览，不保存实际付款、预留、扣减或套餐激活，离开或刷新页面后重置。实际天数计算及扣减时机仍需确定。

## Pet photos in the calendar

The calendar, Add pet review and balance pet list now show profile photos instead of initials. In the local prototype, fictional names are explicitly linked to saved demo profiles and labelled as samples. Sign in as the local administrator to view their private photos. If your session expires, choose Sign in for pet photos in the balance sidebar or below the calendar; the editor stays open. Missing photos show a neutral pet icon; if loading fails, use Retry profile photos. Expand Sample profile photos & credits below the calendar for source/license information.

日历、添加宠物确认页和余额宠物列表使用档案照片，不再显示名字首字母。本地原型的示例名字明确关联至已有测试档案，照片标注为示例；使用本地管理员登录后可查看私密照片。登录过期时，可在余额侧栏或日历下方点击“登录查看照片”，编辑表单会保留。无照片时显示中性宠物图标，加载失败可点击“重试档案照片”。日历下方“示例档案照片与来源”可查看来源及许可。

The latest boarding charge/cancellation workflow is still pending: the owner requested charging at booking and automatic policy-based restoration at cancellation. Confirm balance units and cancellation cutoffs before treating this preview as a working financial booking flow.

最新要求是在寄养预约时扣减余额、取消时按政策自动返还；目前仍需确认余额单位和取消期限，预览尚不能作为实际财务预约流程。

## Cancellation policy page (local preview)

Use Cancellation policy in the boarding workspace navigation or balance sidebar. Edit policy opens a focused draft form for notice days, short-notice restoration and calculation method. Blank rules remain pending. Save policy draft keeps changes while navigating within this workspace; reload/exit resets preview data. This does not activate automatic booking charges/refunds.

在寄养工作区导航或余额侧栏点击“取消政策”。“编辑政策”弹窗可调整提前天数、临近到店返还比例及计算方式，空白规则保持待确认。“保存政策草稿”后可在工作区内切换而保留内容；刷新或退出后预览数据重置，不会启用自动扣费或返还。

## Transactions / Statement (local preview)

Choose Statement in the calendar workspace, or View statement in a pet’s boarding balance to start with that pet selected. Filter by customer, pet, date range and activity. Added / Removed by corrections / Net change summarize the filtered rows; each row’s balance after remains that pet’s original recorded balance. View opens its reference, note and before/after details. Export CSV downloads only matching entries. On phones, rows become cards; wider tables can scroll within their own panel.

Only current preview balance additions, corrections and policy updates appear. Booking charges/cancellation restorations will appear when the financial workflow is implemented. Navigating between these three pages keeps preview data; leaving the workspace/reloading resets it. No real financial statements or payments are created.

在日历工作区选择“交易明细”，或在宠物寄养余额中点击“查看交易明细”，即可默认筛选该宠物。可按客户、宠物、日期及类型筛选；合计显示筛选后的增加、更正减少及净变动，每行余额仍是该宠物当时的原始记录。点击“查看”可看流水号、备注及变动前后余额；“导出 CSV”仅下载符合筛选的记录。手机以卡片展示，较宽表格可在面板内滚动。

当前仅显示预览中的余额增加、更正及规则更新，预约扣减和取消返还尚未接入。在三个工作区页面间切换会保留预览数据，退出或刷新后重置，不创建正式财务明细或付款。

## Integrated local workspace — 2026-11-16

The local administrator preview now opens on Calendar and uses five tabs in this order: **Calendar / Customers / Balances / Statement / Settings**. Customers contains the existing saved customer and pet tools. Balances opens a full page; calendar/review shortcuts still open focused dialogs. Settings links to saved house management and Cancellation policy. Your personal profile is available beside your account at the top.

Tab changes keep saved preview adjustments, the statement and calendar plans in the current session. Personal-profile and customer drafts stay mounted when switching tabs; leaving a balance or policy editor asks before discarding edits. Refreshing/leaving resets sample planning data. Customer and pet saves still use the connected API and its normal permissions. Sample calendar names are not canonical customer bookings. Nothing new is deployed yet, and automatic charges/refunds remain pending the business decisions in requirements.

本地管理员预览默认打开日历，按重要性排列为：**日历 / 客户 / 寄养余额 / 交易明细 / 设置**。客户页面包含已保存的客户与宠物工具；余额独立成页，日历中的快捷入口仍打开弹窗。设置包含房屋管理及取消政策；顶部账号旁可打开自己的资料与宠物。页面切换保留当前预览中的余额调整、明细及日历计划；个人资料草稿也会保留。离开余额或政策编辑器前会询问是否放弃修改。刷新或退出会重置示例计划数据。客户与宠物的保存仍使用已连接的接口及原有权限。尚未部署，也未启用实际预约扣减或取消返还。

## Balances page layout — 2026-11-16

On the local Balances page, choose a customer and pet in the left sidebar. The selected pet’s photo, recorded days, planned days, available days, coverage dates and adjustment history appear on the right. On phones, swipe the pet row or use the customer filter; balance figures stack into readable rows. Add balance opens a focused dialog; Save records the preview adjustment, and Cancel, Close or Escape protect unsaved edits. Existing calendar balance dialogs still work. This remains a planning preview, with no new real financial operations.

本地寄养余额页面在左侧选择客户与宠物，右侧显示所选宠物照片、记录天数、已计划天数、可计划天数、有效日期及调整记录。手机可横向滑动宠物列表或筛选客户，余额数字逐行显示。“增加余额”打开独立弹窗；取消、关闭或 Esc 会保护未保存修改。日历中的原有余额弹窗仍可使用，目前仍为规划预览。

## Latest navigation — 2026-11-16

The four main tabs are now **Calendar / Customers / Balances / Settings**. Open **Balances → Overview** to manage pet credits, or **Balances → Statement** for transaction filters, details and CSV export. A pet’s View statement shortcut opens this same statement view filtered to that pet. Returning to Overview retains the selected pet. Settings contains Cancellation policy; Houses and rooms has been removed from Settings. House management remains in the Calendar’s gear action. This replaces the earlier five-tab navigation instructions; all planning and financial limitations still apply.

主导航现为 **日历 / 客户 / 寄养余额 / 设置**。在“寄养余额 → 余额概览”管理宠物额度，在“寄养余额 → 交易明细”筛选、查看及导出记录。宠物的“查看交易明细”进入同一视图并筛选该宠物，返回概览保留宠物选择。设置中保留取消政策，不再显示房屋与房间；房屋管理仍可从日历的齿轮入口打开。此说明取代之前的五个主标签说明，规划预览与财务功能限制不变。

## Customer filters and your own pets

Customers now has a Filters panel for customer and pet prefix searches. Only my pets selects the customer record linked to your Google identity, including when it is outside the currently loaded directory page. Clear customer filters resets both searches and ownership scope. My profile is in the Account menu; administrators manage their pets through Customers instead of a duplicate pet page.

客户页面顶部的筛选区域支持按客户或宠物名字开头搜索。“只看我的宠物”使用当前 Google 账号关联的客户档案，清除筛选会重置搜索及归属范围。管理员在账号菜单编辑个人资料，在客户页面管理自己的宠物。

## Combined balance and statement preview

Balances now has one shared customer/pet/date/activity filter panel. A selected pet’s current credits appear above its statement; choose All pets for separate per-pet summary cards. No credits are pooled. Calendar stay details link to a pet’s balance; the Calendar header no longer has a global balance button. In the isolated demo, linked test profiles can open their explicitly mapped balance preview and return to the canonical customer/pet profile. These links do not connect real customers to sample credit records.

余额与明细使用同一组客户、宠物、日期及类型筛选。所选宠物的当前额度显示在明细上方，选择全部宠物可逐只查看余额卡片，不合并宠物额度。日历详情可查看该宠物余额，日历顶部不再显示全局余额按钮。本地示例中的档案链接仅通过明确的测试档案对应关系连接，不会把真实客户与示例额度混用。


## Marketing artwork preview — 2026-11-16

The local Home page is now an illustrated garden story. Scroll slowly to move the pets, leaves and flowers; scroll upward to return them to earlier positions. Your device’s Reduce Motion setting shows a static, readable version. Home introduces the experience, while Services, About and FAQs have their own detailed content. The top links scroll to Home introductions; the links inside those introductions open the full guides. Approved customer quotes and permitted names are still needed before testimonials can be published. This design is locally validated and awaits the final combined deployment.

本地首页现在是一幅花园主题的插画故事。慢慢向下滚动，宠物、枝叶和花朵会随滚动位置移动；向上滚动时会回到之前的位置。设备开启“减少动态效果”后，页面会静态展示。首页介绍整体体验，服务、关于我们及常见问题分别保留独立的详细内容。发布客户评价前，仍需要您提供获准公开的原文和署名。当前设计仅在本地完成验证，待所有功能完成后统一上线。


## Continuous cinematic Home preview

Home now plays as one continuous six-chapter story: welcome, experience, trust, services, questions and contact. Scroll down or up to move between scenes; the chapter dots and Continue the story links can jump directly. This is a long story with an ending, as clarified in your request. Reduced Motion shows a normal static page, and short screens use normal page flow. Services, About and FAQs keep their own detailed content. Changing language preserves your chapter. This remains a local preview until the final combined deployment.

首页现在是一段连续的六章节故事：欢迎、体验、信任、服务、问题及联系。向下或向上滚动即可推进或回看，也可以使用章节圆点和“继续这段故事”直接跳转。按您的澄清，这是有结尾的长篇滚动故事。开启“减少动态效果”后会静态展示；较矮的屏幕使用普通页面布局。详细服务、理念和常见问题仍在独立页面中；切换语言会保留当前章节。所有功能完成前仍仅在本地预览。
