## Pages without refresh controls — 2026-11-25

Pages load when opened and update after changes or filter selections. Metrics and Access no longer have routine Refresh buttons. Booking payment review offers **Try again** only when its quote fails to load; changed quotes are still recovered automatically. Other failed reads retain their contextual retry actions.

页面打开时自动加载，并在保存或筛选后更新。经营指标和权限页面不再显示常驻“刷新”按钮。预约付款核对仅在报价加载失败时显示“重试”；报价发生变化时仍自动重新核对。其他读取失败也保留对应的重试操作。

## Browsing records consistently — 2026-11-25

Scroll down to see more balances, activity, payments, accounts, invitations or change history, just as you do with customers and pets. Lists start with up to 25 records. Choose **Load more** to append the next batch; scrolling alone does not load more. If loading fails, the records already on screen stay available; choose **Try again**. On a computer, scroll inside the list while filters stay visible. On a phone, scroll the page normally. Pet booking/activity dialogs work the same way inside the dialog. Exports still include every matching record, including records you have not scrolled to.

余额、活动、付款、账号、邀请和更改历史现在与客户、宠物列表使用相同的浏览方式：列表先显示最多 25 条记录。点击“加载更多”追加后续记录；仅滚动页面不会加载新记录。加载失败时，已显示的记录会保留，可点击“重试”。电脑上在列表内滚动，筛选条件保持可见；手机上正常滚动页面。宠物弹窗中的预约和活动也使用同样方式。导出仍包含所有符合筛选条件的记录，不受当前已加载数量限制。

## Finding customers and pets — 2026-11-24

In Customers, type any part of a customer's name/email or a pet's name. Results update automatically; using both fields narrows the results together. The customer list shows owners of matching pets, and selecting an owner shows only their matching pets. Clear a field to widen the search again. Scroll within either panel to review its records, then choose Load more for the next batch. View balance and edit actions stay aligned on pet rows.

在“客户”中输入姓名、邮箱或宠物名字的任意部分，结果会自动更新。两个输入框会同时筛选：客户列表只显示拥有匹配宠物的客户，选中客户后，右侧也只显示匹配的宠物。清空输入框可扩大搜索范围。可分别滚动两个面板查看已显示的内容，点击“加载更多”查看下一批记录。宠物行中的余额和编辑操作保持对齐。

## Automatic website updates — 2026-11-24

After a reviewed change is merged and its checks pass, the app publishes automatically. A green validation check means the code passed its checks; the deployment must also finish successfully before the hosted version is updated. We handle implementation, review, release and live verification for you.

已审核的更改合并并通过检查后，应用会自动发布。绿色的验证检查表示代码检查通过；还需等待部署成功，线上版本才会更新。实现、审核、发布和线上验证都由我们处理，无需您操作终端。

## Searchable choices — local preview

Click Find a pet to choose a saved pet, or type in the field to narrow the list. Choose All pets to clear the pet filter. Other dropdown fields also accept typing to filter their choices. Select a matching option to apply it; unmatched text is not saved as a value. Unsaved-changes banners are removed; leaving an edited form still asks whether to discard edits.

点击“查找宠物”可选择已保存的宠物，也可直接输入以筛选选项。选择“所有宠物”清除筛选。其他下拉框也支持输入筛选，选择具体选项后才应用；不会保存未匹配的文字。已移除未保存提示横幅，离开已修改表单时仍会确认是否放弃修改。

## Dialog links, customer filters and country holidays — local preview

Dialogs now have their own URLs. Copy the address to reopen that task; refreshing loads the saved record again. Browser Back closes the dialog and Forward reopens it. Unsaved text is never placed in a link; leaving an edited form asks whether to discard changes. Text-field focus outlines remain inside the field so the modal cannot cut them off.

Calendar and Balances customer filters include **All customers**. Opening a dropdown keeps the chosen customer's name visible; choosing All customers clears the filter while keeping administrator access.

Under Pricing → Holiday dates & surcharge, reference dates are grouped into **United States**, **China** and **India**. Choose only the dates your business uses. Merely opening a country group does not activate fees. Custom dates remain available. Some regional/movable dates, particularly India 2028, are explicitly unavailable until verified; do not assume the list is every regional public holiday. Reference data and your selected fee dates are stored separately in the database.

弹窗现在有独立网址，可复制链接重新打开；刷新后重新读取已保存记录。浏览器后退关闭弹窗，前进重新打开。未保存内容不会写入链接；离开已修改表单前会询问是否放弃。输入框聚焦边框已改为内侧显示，避免被弹窗裁切。

日历和余额的客户筛选包含“所有客户”。打开下拉框时保留当前客户名称；选择“所有客户”清除筛选，仍保持管理员权限。价格设置中的节假日按美国、中国、印度分组，仅勾选的日期才应用附加费，自定义日期保留。未核实的地区性或浮动节日会明确提示，不会猜测日期。

All changes are local; no commit, PR or deployment has been made.

## Calendar filters and booking order — local preview

In Calendar, choose a customer to see only locations with their matching pets in the displayed dates. Administrators remain in admin view. Turn off **Only locations with matching pets** to show all houses/rooms again. Pet name, type, status and location filters work together. The Customer & pet and Location headings have been removed.

In Add booking, enter fields in whichever order is convenient. You can enter dates first or select a pet first; selecting a pet fills its customer. Continue to room selection once a pet and valid stay times are present, then choose an available room before review. Nothing is saved until final confirmation.

在日历中选择客户后，只显示所选日期内有匹配宠物的房屋和房间；管理员仍保留管理员视图。取消勾选“仅显示有匹配宠物的房屋和房间”可恢复全部地点。宠物名称、类型、状态及地点筛选可组合使用，分组标题已移除。

添加预约时可按任意顺序填写，可先输入日期或先选宠物；选宠物后自动填入其客户。选定宠物并填写有效的入住时间后进入选择房间，再选可用房间进入核对。最终确认前不会保存。

## Test cards and staff booking payments — local preview

Open http://localhost:4180/app/payments/ . In **Payments**, choose a customer and **Add test card**. In the dialog choose a successful or declined test payment; you can also remove the test card. These cards use no real bank details or money. The page lists saved test charges and links to their bookings.

When staff review a booking, the payment section shows required boarding days, days covered by that pet’s valid balance, uncovered days, the test card amount and the remaining balance. Enough valid days are deducted when you save. If the balance is insufficient and there is no card, saving is blocked. With a card, the remaining base amount and separate holiday fee are simulated. A declined card leaves the booking and balance unchanged. Keep the same save attempt when retrying a connection failure to avoid duplicate operations.

Charged bookings can change rooms without charging again when dates/timezone stay the same. Date changes and cancellation refunds still need approved rules and are currently unavailable for charged bookings. Existing unbilled plans remain available. This is local test functionality, not a hosted update or real payment service.

打开 http://localhost:4180/app/payments/ 。在“付款”中选择客户，点击“添加测试卡”，选择模拟成功或失败，也可移除测试卡。不使用真实银行卡资料或资金。页面可查看测试扣款记录并打开对应预约。

员工核对预约时，可看到所需寄养天数、有效余额支付天数、测试卡支付部分及预约后余额。有效余额充足时保存预约会扣除天数；余额不足且无卡时无法保存；有测试卡时模拟支付不足部分及单独的节假日费用。模拟付款失败不会保存预约或扣除余额。

已扣款预约可在日期及时区不变时更换房间，不会重复扣款。日期变更及取消退款规则尚待确认，目前无法用于已扣款预约。原有未扣款预约功能保留。以上仅供本地测试，尚未发布，也未接入真实付款。

## Cleaner controls and customer-view banner — local, 2026-11-20

Add balance, Add/Edit customer and Add price dialogs no longer have an extra border around their contents. Common actions have icons alongside their labels and react to hovering. Language menus match the selected app theme. Customers search and Add customer align together; row hover backgrounds leave space around dividers. Pricing keeps Holidays and Add price together, with Add price at the right.

When viewing a customer as an administrator, the banner above the workspace shows the customer’s name. Choose Return to admin to leave that view and open Metrics. The banner stays available even if a page cannot load; you remain signed into your own administrator account.

新增余额、新增／编辑客户和新增价格的弹窗已去除内容区多余边框。常用操作加入图标，并提供悬停反馈；语言菜单与所选主题一致。客户搜索与“新增客户”对齐，客户行悬停背景与分隔线之间留有间距；价格页面将节假日与新增价格放在一起，“新增价格”位于最右侧。

管理员代客户查看时，页面上方横幅会显示客户姓名。点击“返回管理员视图”即可退出客户视角并打开指标页面；即使页面加载失败，仍可通过横幅返回。实际登录的始终是您自己的管理员账号。

## Booking date picker — local, 2026-11-20

Choosing a day now closes the calendar and returns focus to the booking field. To change the time afterward, open the field again, edit hour/minute, then Apply. Changing the day keeps the existing time.

选择日期后，日期面板会自动关闭，焦点返回预约输入框。需要修改时间时，再次打开输入框，调整小时和分钟后点击“应用”。更改日期会保留已有时间。

## Simpler Calendar — local, 2026-11-20

Calendar room rows no longer show capacity. Time controls now read Previous/Today/Next, date heading, view choices, timezone. Room capacity rules still apply.

日历房间行不再显示容量，但容量规则仍然有效。时间控件顺序为：上一时段／今天／下一时段、日期标题、视图、时区。

Calendar no longer has House operations or Calendar settings buttons or pages. Old links return to Calendar. Use the house/room row gears for focused editing. Cancellation policy remains in Balances. Employees can still open their personal profile. Filters are compact, and the timezone selector has no visible label. Navigation, the date heading, timezone and view choices stay together; Add booking is separate. The date input is removed. Saved data has not been deleted.

日历已移除“房屋运营”和“日历设置”按钮及页面，旧链接会返回日历。仍可点击房屋或房间行的齿轮图标进行编辑；取消政策保留在余额页面。员工仍可管理个人资料。筛选区已精简，时区选择框不再显示标签。日期导航、日期标题、时区及视图切换放在一起，“添加预约”单独显示；已移除日期输入框。已保存的数据不会删除。

## Consistent controls and Metrics — local preview, 2026-11-19

Calendar, Pricing, Balances and Metrics now share the same segmented controls. Selected Apple controls are red; Microsoft Light controls are blue, with white text. Other choices have bold labels. In Calendar, navigation, the date heading, Timezone and view choices stay together, separate from booking/management actions. The date input is removed; use Previous, Today and Next. Timezone has its label on the left and remains available when filters are hidden. Desktop uses one toolbar row; phones wrap. The smaller settings icon keeps a full touch target.

Metrics shows saved records directly; there is no Sample data switch. Clearly labeled local test customers and stays now provide persisted chart activity. Existing local records are preserved, so totals can differ from the old sample screen. Revenue stays unavailable until actual payment records are supported. Production business data has not been populated with test records. Further browser checks run headlessly.

日历、价格管理、余额和指标现在共用分段控件。Apple 主题选中项为红底白字，Microsoft Light 为蓝底白字，其他选项使用粗体。日历的“时区”位于日期和视图控件旁，标签在选择框左侧，收起筛选后仍可使用。

指标直接读取已保存记录，不再显示“示例数据”切换。本地数据库已加入明确标注的测试客户及入住记录，保留原有资料，因此总数可能与原示例界面不同。收款记录尚未实现，营收仍显示暂无数据。正式业务数据库没有加入测试资料。后续浏览器检查均使用无界面模式。

## Releases after merging — 2026-11-19

Codex previews and checks changes locally, then submits a focused PR. GitHub tests the merged `main` version and publishes it automatically when all checks pass. PRs and feature branches do not publish. A failed check keeps the previous hosted release; the Actions page shows the cause. You do not need to run a terminal or deploy manually.

Codex 会先在本地预览并检查修改，再提交独立的 PR。合并到 main 后，GitHub 会运行检查，全部通过后自动发布。PR 和功能分支不会上线；检查失败时，线上保留原版本，可在 Actions 查看原因。您无需使用终端或手动部署。

## Cleaner Metrics dashboard — local preview

Open http://localhost:4180/app/metrics/. Current totals are first, followed by six matching chart cards. The large number in a chart is the whole reporting-period total; the small caption shows the selected point. Hover/tap a point or use arrow keys; the table icon shows exact values.

The local demo opens with **Sample data**, clearly labeled fictional. Revenue, days, bookings, new customers, boarding usage and handoffs have realistic example values. Choose **Saved records** for the original business records. The sample view never updates accounts or bookings; online dashboards do not use these fictional values. Change dates and timezone to compare periods.

打开 http://localhost:4180/app/metrics/。当前总数位于顶部，下方六张图表采用一致布局。图表中的大数字为所选时段总数，小字说明显示选中的数据点。点击、悬停或用方向键选择数据点，表格图标可查看准确数值。

本地演示默认显示明确标注的虚构“示例数据”，包括合理的营收、天数、预约、新增客户、寄养使用及交接数值。选择“已保存记录”可返回原业务数据。示例不会更改任何账户或预约，线上应用也不会使用这些虚构数值。可切换日期及时区比较时段。

## Metrics, Activity and calendar filters — local preview, 2026-11-19

Open http://localhost:4180/app/metrics/ for the local preview. **Metrics** is the first administrator tab. Choose dates and timezone to view bookings, new customers, boarding-day changes and recorded boarding usage. Tap a graph point or use arrow keys; the table icon shows exact values. Revenue will appear only after payments are recorded. Day balances are not dollar revenue.

**Balances** and **Activity** use the same tab style as Pricing. Activity shows each pet’s before/after day balance and the recorded reason. Icon buttons have labels on hover and work with screen readers. Calendar has separate **Customer & pet** and **Location & timezone** filters; collapse Filters to give the calendar more room on your phone.

Booking/cancellation balance automation still needs the remaining financial rules. Staff plans currently remain unbilled. Source changes are being grouped into reviewed PRs; the hosted app is not updated yet.

本地预览：http://localhost:4180/app/metrics/。“经营指标”现为管理员的第一个标签。选择日期及时区，可查看预约、新增客户、寄养天数变动及已记录的寄养使用情况。点击图表数据点或使用方向键，表格图标可查看准确数值。尚无已记录收款时，收入会明确显示不可用；寄养天数不是美元收入。

“当前余额”和“变动记录”采用与价格管理一致的标签样式。变动记录显示宠物变动前后的天数及已记录原因。图标按钮带有提示及无障碍名称。日历筛选分为“客户与宠物”和“位置与时区”；手机可收起筛选，为日历留出空间。

预约扣除天数及取消后恢复余额仍需确认剩余财务规则。当前员工计划仍明确不扣费。代码更新正在分组提交审核；线上应用尚未更新。

## Reviewing the refreshed workspace

In Calendar, click **+** beside a house to add a room directly. Click the house name to see its saved address. A house needs its address completed before rooms can be added.

In **Balances**, use **Current balances** for saved days and validity dates, or **Activity** for recorded changes. The clock beside a pet opens that pet’s activity. Filters stay selected when switching views. CSV export includes every matching page, while displayed change totals cover only the current page. Existing balance adjustments and validity templates still use focused dialogs.

In **Customers**, search by customer or pet, then choose a customer to manage their pets. Phone screens open a compact pet view; **Back to customer list** keeps your search. Edit and Google-account-link icons remain beside customer records.

Administrators have a **Business metrics** tab. Choose 7/30/90 days or custom dates and a timezone. Scheduled arrivals/pickups and recorded actual handoffs are counted separately. Current customer/pet totals, pets in care, overdue pickups and saved boarding-day totals are labeled separately from the reporting period. Revenue stays unavailable until payment collection is configured. Use Refresh for a new snapshot.

日历中，点击房屋旁的 **+** 可直接添加房间；点击房屋名称可查看地址。房屋需要先完善地址。**余额**分为“当前余额”和“变动记录”，宠物旁的时钟可查看该宠物的记录，导出包含所有符合筛选条件的分页。**客户**支持按客户或宠物查找；手机中可返回客户列表并保留搜索。管理员的**经营概况**支持日期和时区筛选，分别统计计划与实际交接；当前总数另行标示，收款未配置前不显示营收。

These changes are developed locally; see the current handoff for PR and deployment status.

# Making changes to your website

## Change the app's appearance

Inside the app, click the palette icon, or open Menu → Appearance on a phone. Choose Google, Apple, Microsoft Light or Microsoft Dark. Each choice changes colors and component styling together across navigation, fields, dropdowns, calendars and dialogs. The preview shows the palette together. Dark Modern also makes the work areas and forms dark. Google is the default; use Reset to Google to restore it.

Choices appear immediately and are remembered in this browser, including its other open app tabs. They do not change another person's appearance or the public marketing site. The marketing navbar has no theme button. If browser storage is unavailable, the dialog explains that changes last for this session. English and Chinese labels are available through the language menu. No separate corner-style setting is needed.


## Current app navigation and management

Administrators use **Calendar / Balances / Customers / Pricing / Business metrics**. Customer view uses **Calendar / Balances / Pets**. Settings is not a navbar button. Manage houses and rooms from Calendar; open employee house access from that management page. Balances provides validity templates and the cancellation-policy draft. Employees open their assigned-house care workspace. My profile shows the actual signed-in account’s roles even while viewing a customer.

These app features are merged after validation; the hosted site changes only after the final deployment. Paid bookings, package purchases, automated refunds and withdrawals need the remaining approved payment and business rules. For pets without a booking, the room-association rule still needs your decision.

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

Add booking opens full screen and guides you through **Stay details → Choose room → Review**. Choose the pet and planned times, then choose an available room on the calendar. Gray room ranges remain unavailable, and configured room capacity still applies. There is no manual day count or capacity override. Until the billing-day rule is confirmed, usage and the resulting balance show N/A; saving the local schedule does not deduct or reserve credit. Open **Add balance / Manage pet balance** from review without losing the stay draft.

“添加预约”以全屏打开，依次选择宠物与时间、在日历上选择可用房间，最后确认。灰色时段不可用，房间容量规则仍然生效。无需填写所需天数，也没有手动容量覆盖选项。计费天数规则确认前，使用天数与预计余额显示 N/A；保存本地安排不会扣减或预留额度。可从确认页打开余额管理，预约草稿会保留。

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

## Historical workspace layout — superseded

The local administrator preview now opens on Calendar and uses five tabs in this order: **Calendar / Customers / Balances / Statement / Settings**. Customers contains the existing saved customer and pet tools. Balances opens a full page; calendar/review shortcuts still open focused dialogs. Settings links to saved house management and Cancellation policy. Your personal profile is available beside your account at the top.

Tab changes keep saved preview adjustments, the statement and calendar plans in the current session. Personal-profile and customer drafts stay mounted when switching tabs; leaving a balance or policy editor asks before discarding edits. Refreshing/leaving resets sample planning data. Customer and pet saves still use the connected API and its normal permissions. Sample calendar names are not canonical customer bookings. Nothing new is deployed yet, and automatic charges/refunds remain pending the business decisions in requirements.

本地管理员预览默认打开日历，按重要性排列为：**日历 / 客户 / 寄养余额 / 交易明细 / 设置**。客户页面包含已保存的客户与宠物工具；余额独立成页，日历中的快捷入口仍打开弹窗。设置包含房屋管理及取消政策；顶部账号旁可打开自己的资料与宠物。页面切换保留当前预览中的余额调整、明细及日历计划；个人资料草稿也会保留。离开余额或政策编辑器前会询问是否放弃修改。刷新或退出会重置示例计划数据。客户与宠物的保存仍使用已连接的接口及原有权限。尚未部署，也未启用实际预约扣减或取消返还。

## Balances page layout — 2026-11-16

On the local Balances page, choose a customer and pet in the left sidebar. The selected pet’s photo, recorded days, planned days, available days, coverage dates and adjustment history appear on the right. On phones, swipe the pet row or use the customer filter; balance figures stack into readable rows. Add balance opens a focused dialog; Save records the preview adjustment, and Cancel, Close or Escape protect unsaved edits. Existing calendar balance dialogs still work. This remains a planning preview, with no new real financial operations.

本地寄养余额页面在左侧选择客户与宠物，右侧显示所选宠物照片、记录天数、已计划天数、可计划天数、有效日期及调整记录。手机可横向滑动宠物列表或筛选客户，余额数字逐行显示。“增加余额”打开独立弹窗；取消、关闭或 Esc 会保护未保存修改。日历中的原有余额弹窗仍可使用，目前仍为规划预览。

## Historical navigation — superseded

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


## Calmer marketing preview — 2026-11-16

The marketing navbar is shorter, with sign-in and language side by side. Scroll chapters now gently fade and settle vertically. The pets and plants move more subtly, and the public pages share softer cream, sage and clay colors. Scroll upward to retrace the story; Reduce Motion still shows ordinary readable sections. Preview locally at http://localhost:4180/home/. This update is not deployed yet.

营销网站的导航栏更紧凑，登录和语言选择并排显示。滚动章节现在轻柔淡入并上下微移，宠物与植物的动作更克制，各公开页面统一使用柔和的奶油色、鼠尾草绿与陶土色。向上滚动可以回看；开启“减少动态效果”后仍以普通页面显示。当前仅在本地预览，尚未上线。


## Faster marketing navigation — 2026-11-16

The top links and chapter controls now go directly to their destination. Home returns to the very top with the whole navbar visible. Scrolling by hand still plays the story forward and backward. The previous colors are preserved. This is a local preview, awaiting the final combined deployment.

顶部导航和章节控件现在直接跳转至目标位置，不再播放沿途章节动画。“首页”会回到页面最顶部，完整显示导航栏。手动滚动仍可推进或回看故事。保留原来的配色，目前仅在本地预览，等待最终统一上线。


## Always-visible marketing navbar — 2026-11-16

The compact navbar stays visible while you read or scroll. Each story scene fills the screen below it; use the top links to jump directly at any time. Artwork has more movement while the text stays steady. Short screens and Reduce Motion use ordinary page sections. Colors are unchanged. This is locally complete and awaits the final combined deployment.

精简导航栏在阅读或滚动时始终可见，每个故事场景填满导航栏下方的屏幕空间。随时点击顶部链接即可直接跳转。插画动作更丰富，文字保持稳定。较矮的屏幕和“减少动态效果”模式使用普通页面布局。配色保持不变；当前本地完成，等待最终统一上线。


## Acceleration while scrolling — 2026-11-16

The story artwork starts gently and moves faster as you scroll farther into each scene. Stop scrolling to hold the pose; scroll upward to retrace it. Navbar clicks still jump directly, and colors are unchanged. This is a local update awaiting the final combined deployment.

故事插画在每个场景开始时轻柔移动，随着继续向下滚动逐渐加速。停止滚动即可停留在当前画面，向上滚动可沿原轨迹回看。导航点击仍直接跳转，配色保持不变。目前为本地更新，等待最终统一上线。


## Animated section buttons and active navigation — 2026-11-16

Click the top navbar or right-side chapter controls for a short animated change to the chosen section. It skips the scenes in between. The navbar highlights the section you are reading, including when you scroll by hand. Services now uses a neutral cream background. Reduce Motion keeps direct jumps. This is locally validated and awaits the final combined deployment.

点击顶部导航或右侧章节控件，会以短暂动画切换到所选章节，跳过中间场景。导航栏会标记当前阅读的章节，手动滚动时也会更新。服务章节改为中性的奶油色背景。“减少动态效果”模式保持直接跳转。当前本地验证完成，等待最终统一上线。


## One continuous illustrated garden — 2026-11-16

The six chapters now share one landscape. Scroll to reshape the hills and path, carry a seed through the story and turn the sun into a moon. Look closer: flower petals open, leaves sway, the dog wags its tail, and the sun/moon/trust symbols change inside their shapes. Scroll backward to retrace every change. The navbar stays visible and current; click transitions are still brief. Reduced Motion keeps a readable static page. This remains a local preview awaiting the final combined deployment.

六个章节现在共用一幅连续的风景。滚动时，山丘与小径变换形状，花种穿过故事，太阳逐渐变成月亮。花瓣会舒展，叶片会摆动，小狗会摇尾巴，太阳、月亮和信任图标内部也会变化。向上滚动可沿原轨迹回看。导航栏始终可见并标记当前章节，点击切换保持简短。“减少动态效果”模式显示易读的静态页面。目前仍为本地预览，等待最终统一上线。


## Clearer navbar transitions — 2026-11-16

Navbar and right-side chapter clicks now animate the chosen scene reliably. The outgoing scene leaves gently and the destination rises into place; the transition takes about half a second. The shared landscape and navbar stay visible. Reduce Motion still jumps directly. This fix is locally validated and awaits the final combined deployment.

顶部导航和右侧章节按钮现在会可靠地播放所选场景的切换动画：当前内容轻柔退出，目标内容向上进入，总时长约半秒。共用风景和导航栏保持可见。“减少动态效果”模式仍直接跳转。修复已在本地验证，等待最终统一上线。


## Calmer movement and resizing shapes — 2026-11-16

Scenes now move into and out of the screen without fading. The sun and flower stay on their own sides with slow drift and gradual size changes. Arches, petals, portraits and illustrated frames grow or contract with the scroll. Navbar and chapter clicks move forward/up or backward/down as appropriate. Reduce Motion keeps ordinary static sections. This is locally validated and awaits the final combined deployment.

场景现在通过移入和移出屏幕切换，不再淡入淡出。太阳和花朵固定在各自一侧，只缓慢漂移并逐渐改变大小。拱门、花瓣、宠物插画及边框会随滚动舒展或收缩。导航及章节按钮根据方向向上或向下移动内容。“减少动态效果”模式保留普通静态页面。当前本地验证完成，等待最终统一上线。


## A travelling sun and purposeful scale — 2026-11-16

The sun now travels along one gentle arc through the whole story, rather than bouncing between sides or staying fixed. Sun and flower sizes adapt to the screen; they do not grow continually as you scroll. Other resizing supports perspective and scene departures. Movement-only transitions, the visible/current navbar and Reduce Motion remain. This is locally validated and awaits the final combined deployment.

太阳现在沿一条柔和的弧线贯穿整个故事，不再左右反复跳动，也不再固定不动。太阳与花朵的大小根据屏幕调整，不会随着滚动不断变大；其他缩放用于表现透视与场景离开。继续保留无淡入淡出的移动切换、始终可见并标记当前章节的导航，以及“减少动态效果”模式。目前本地验证完成，等待最终统一上线。


## Navbar opens pages; Home is the scroll story — 2026-11-17

Use the top navbar to open Home, Services, About us or FAQs as separate pages. Each opens at the top and highlights its own navbar item. Home remains the animated scroll story: scrolling its chapters keeps Home selected and the navbar steady. Use the right-side chapter dots/Continue links to move within Home. Its Services introduction now comes before About, matching the navbar order. This is locally validated and awaits the final combined deployment.

顶部导航分别打开首页、服务项目、关于我们及常见问题页面；每页从顶部开始，并标记相应导航项。首页仍是动画滚动故事，滚动章节时导航栏保持稳定，始终选中“首页”。右侧章节圆点和“继续”链接用于首页内部跳转。首页中的服务介绍现在位于关于我们之前，与顶部导航顺序一致。当前本地验证完成，等待最终统一上线。


## Sun-to-moon and expressive pets — 2026-11-17

Scroll Home to turn one travelling sun into a crescent moon. The pets' eyes, brows, noses, smiles, cheek and jaw contours, chins, forehead fur, hairlines and ears change as you scroll. Scroll upward to retrace the same expressions. On wider screens the right chapter marker slides up/down between dots without a background panel. Reduce Motion keeps static artwork. This is locally validated and awaits the final combined deployment.

滚动首页时，同一个太阳会逐渐变成弯月。宠物的眼睛、眉毛、鼻子、嘴唇与微笑、面颊及下颌轮廓、下巴、额头毛发、发际线和耳朵都会随滚动变化；向上滚动会沿原轨迹回到先前表情。较宽屏幕右侧的章节指示条会在圆点间上下移动，背景面板已移除。“减少动态效果”保留静态插画。目前仅在本地验证，等待最后统一部署。


## Marketing site refresh — 2026-11-17

The local navbar is Home / Services / Our Spaces / About us / Pricing / FAQs / Contact us. Open the Services arrow for daycare, boarding, pet grooming or Grooming Academy. On phones, use Menu; language and sign-in are inside it. Pricing includes the cancellation policy, and its Services link opens the Services page. Old cancellation links still work.

Home now has nine connected chapters, including all four services, a spaces preview, large-number area and family stories. Previous chapter / Next chapter / Restart story move the shared flower, sun/moon, shapes and side marker together. Reduced Motion and short screens show ordinary sections. About contains full family stories; Academy has the student photo/story area. Tap a gallery photo to enlarge it; Close or Escape returns to the photo. The deep-green footer carries the same navigation and styling.

Sample photos are clearly marked and do not show our actual spaces, students or work. Actual prices, contact details, course facts, approved reviews, photos and verified totals are still needed. Numbers are currently blank, not zero, and are not connected to business records yet. Tell Codex what to change in English or Chinese; you do not need to edit files or use a terminal. This is a local preview, not a new hosted release.

本地导航为：首页 / 服务项目 / 我们的小天地 / 关于我们 / 价格 / 常见问题 / 联系我们。服务箭头可展开日间托管、寄养、美容及美容师成长课堂。手机上点击“菜单”，登录与语言选择也在其中。取消政策整合在价格页内，旧链接仍可使用，其中的服务链接会打开独立服务页。

首页现在包含九个相连章节，展示四类服务、空间预览、数字区域及家长故事。“上一章 / 下一章 / 重新开始”会同时移动共用花朵、太阳与月亮、内部图形及侧边指示条。开启减少动态效果或使用较矮屏幕时，显示普通页面布局。关于页面展示完整家长故事，课堂页面展示学员照片与故事区域。点击图库照片可放大，关闭或按 Esc 返回。深绿色页脚与整站保持一致。

示例照片均有明确标注，不代表本店空间、学员或作品。实际价格、联系方式、课程信息、获准公开的评价、真实照片及核实后的数字仍待提供。当前数字留空，并非零，也尚未接入实际业务记录。可直接用中文或英文告诉 Codex 要改什么，无需编辑文件或使用终端。当前为本地预览，尚未发布新版本。


## More expressive artwork — 2026-11-17

The shared flower can now leave either side of the scene and return later. Icons turn more noticeably. Animal ears move independently, noses tilt/reshape and mouths visibly open into a smile as you scroll or choose a chapter. The numbers section now has a paw, scissors and learning-book illustration for its three items. Reduce Motion keeps static artwork. Real totals remain pending, and nothing new has been deployed.

共用花朵现在可以从场景左右两侧离开，随后再次出现。图标旋转更加明显；动物左右耳朵分别摆动，鼻子倾斜并改变形状，嘴巴随滚动或章节切换张开微笑。数字区域的三个项目分别配有爪印、剪刀和学习书本插画。“减少动态效果”保留静态插画。真实数字仍待核实，尚未部署新版本。


## Updated marketing navigation — local preview

On desktop, hover over Services, Our Spaces, About us or Pricing to see their section links. Keyboard users can Tab through the same links and use Escape to close. On phones, open Menu and tap the visible section links. The preview banner has been removed; the phone footer has extra space below Back to Home.

电脑上，将鼠标移到服务项目、我们的小天地、关于我们或价格，即可查看子页面及章节链接。键盘可用 Tab 选择、Esc 关闭。手机上打开“菜单”即可点击各章节链接。预览横幅已移除，手机页脚的“回到首页”下方增加了留白。


## Paired introductions and simpler footer — local preview

Each pet now sits next to its own numbered introduction on phones and above it on desktop. The footer keeps the brand and copyright; use the navbar and its menus for navigation. Phone numbers have matching sizes, and background reveals wait for the chapter's halfway entry point.

手机上，每只宠物都与对应的编号介绍放在一起；电脑上则在对应介绍上方。页脚保留品牌和版权信息，页面导航统一使用顶部菜单。手机数字字号已统一，背景在章节进入一半后开始展开。


## Marketing polish — local preview, 2026-11-17

Open http://localhost:4180/home/ to review the updated site. On phones, Menu has compact navigation and small arrows for section links. Language options float above the menu without moving Sign in. Sign in opens a popup over your current page; Continue with Google opens the secure Google window. Your supplied grooming and washing photographs replace the sample images. The photos are larger, each caption sits beside its photo, and standard portrait phones share the desktop scroll story. The footer has balanced spacing and the same warm colors and lettering as the rest of the site. Reduced Motion remains available. This is locally complete, awaiting the final combined hosted release.

打开 http://localhost:4180/home/ 查看本地更新。手机菜单更紧凑，小箭头可展开分区链接；语言选项浮在菜单上方，不会把登录按钮往下推。点击登录会在当前页面打开弹窗，再点击 Google 登录即可进入安全登录窗口。您提供的美容与洗护照片已替换示例图片，手机照片更大，说明文字与各自的照片并排对齐。常见竖屏手机保留与电脑相同的滚动故事动画；减少动态效果选项仍然有效。页脚的留白、暖色和字体与整站保持一致。目前为本地更新，等待最后统一发布。


## Home story refinements — local preview, 2026-11-17

Chapters3 and6 now show each service or milestone on its own full-width row. The sun’s rays fade away as the moon appears, and return when you scroll backward. The last chapter keeps its green background expanded as you scroll down toward the footer. Preview at http://localhost:4180/home/; not deployed yet.

首页第3及第6章中，每个服务或数字项目各占一整行。太阳光芒会在月亮出现时淡出，向上滚动时恢复。第9章向下滚动至页脚时，绿色背景保持展开。当前仅为本地预览，尚未发布。


## Full-width mobile Home photos — local preview, 2026-11-17

Home photos now fill the phone’s content width, with their captions underneath and matching24px corners. Scroll inside the photo chapter to see both complete portraits; the existing Next control still advances the story. The opening flower stays clear of the sun and wording, and the final flower sits above its text. “MAKE ROOM FOR THE DETAILS” now has more space underneath. Preview at http://localhost:4180/home/; not deployed.

手机首页照片现占满内容宽度，说明文字位于各自照片下方，四角统一为24px圆角。在照片章节内向下滚动可查看两张完整照片，也可继续使用“下一章”按钮。开场花朵与太阳、文字保持间距；最后一章的花朵位于文字上方。安排计划区域的小标题下方也增加了留白。目前仅在本地预览，尚未发布。


## Desktop chapters and quote styling — local preview, 2026-11-17

Desktop Home chapter3 shows services in two columns; chapter6 shows three large milestone columns. Phones retain full-width rows. Chapter7’s quote uses larger italic serif text with a slim clay-colored line and a smaller family attribution. Review at http://localhost:4180/home/; not deployed.

电脑首页第3章采用两列服务卡片，第6章采用三列大数字展示；手机继续保持每项一整行。第7章的引文使用更大的衬线斜体字，配以细陶土色竖线和较小的署名。当前仅为本地预览，尚未发布。


## Centered animated icons — local preview, 2026-11-17

The hair gathers when the scissors close and spreads when they reopen. Scroll backward to retrace it. Icons stay centered inside their frames while their internal shapes animate. Review Home, Services and Our Spaces at http://localhost:4180/home/. Not deployed yet.

剪刀合拢时，毛发向中间靠拢；剪刀张开时，毛发向两侧展开。向上滚动可沿原轨迹返回。图标在内部图形变化时仍保持在外框中央。当前仅为本地预览，尚未发布。


## Centered finishing details — local preview, 2026-11-17

The full family-story section (heading, introduction, quote, attribution and links), growing-story line, photo captions and footer are centered. The last milestone has no border, and preparation steps no longer have decorative checkmarks. Text-and-arrow links have compact spacing and continuous underlines throughout the marketing site. Hover or keyboard-focus Contact us on Home for a white button with green text. This is locally validated and not deployed.

家长故事的整段内容（标题、介绍、引文、署名与链接）、成长故事短句、照片说明和页脚已居中。最后一个数字项目移除了边框，来访准备步骤移除了装饰性勾号。营销网站中的文字与箭头间距更紧凑，下划线连续。首页“联系我们”按钮在悬停或键盘聚焦时显示为白底绿字。目前仅为本地更新，尚未发布。


## Marketing update is live — 2026-11-17

The reviewed marketing version is now published at https://niu-niu-family-paws.web.app/home/. Desktop/mobile and English/Chinese live checks passed, including the centered sections/footer, photo layouts, menus and sign-in dialog. Google’s secure provider window opens normally. Production continues to show only approved business content; sample prices, totals and testimonials remain part of the local preview. Unfinished booking/balance workflows are not activated by this marketing release.

本次确认的营销网站版本已发布：https://niu-niu-family-paws.web.app/home/。电脑、手机及中英文的线上检查均已通过，包括居中排版、页脚、照片、菜单和登录弹窗。Google 安全登录窗口可正常打开。正式网站继续只展示已批准的业务内容；示例价格、数字及评价仍仅用于本地预览。本次营销网站更新不会启用尚未完成的预约或余额流程。


## Drop-in visits and dog walking — local preview, 2026-11-17

Services now includes Drop-in visits (care for pets at home) and Dog walking. Find them in the Services menu and Pricing, in English and Chinese. Prices, visit/walk length and service area remain to be confirmed. Preview: http://localhost:4180/services/#drop-in. Not published yet.

服务项目现已加入“上门照护”和“遛狗服务”，服务菜单及价格页均可查看，支持中英文。价格、时长及服务范围仍待确认。目前为本地预览，尚未上线。

## Local booking and balance update — 2026-11-18

In the local app, choose a customer, optionally narrow by pet type, then choose their pet. The selected pet keeps its avatar inside the field. Picking a day fills the date immediately; select the hour and minute and use Apply to complete the time. Choose green available space, review the details and save. Staff plans remain explicitly unbilled while the financial rules are pending. The clearly labeled Practice room is for local testing, with a test-only address rather than a real business location.

Balances now has Validity templates: save a name and reviewed dates, then choose that template when adding or adjusting a pet's balance. Changing or archiving a template leaves existing balances unchanged. Calendar house/room gears open focused editing dialogs. These changes are local and have not been committed, pushed or deployed.

本地应用中，请先选择客户，可按宠物类型筛选，再选择宠物；选中后，输入框内也会显示宠物头像。点击日期后，日期会立即填入输入框；请再选择小时与分钟，点击“应用”完成时间设置。选择绿色可用空间，核对详情后保存。收费规则尚待确认，员工预约计划会明确标注未扣除余额。“测试房间”仅用于本地测试，所示地址不是实际营业地址。

余额页面现支持“有效期模板”：保存名称及已核对的日期，之后为宠物添加或调整余额时即可选用。修改或归档模板不会更改已有余额。日历中房屋及房间旁的设置图标可打开编辑弹窗。以上更新仅在本地，尚未提交、推送或部署。


## Account roles and management links — local preview

My profile shows the roles attached to your signed-in Google account: Admin, Employee and/or Customer. These labels cannot be edited in the profile, and viewing as another customer does not change your own roles. If roles cannot be verified, refresh to retry. The app bar no longer has Settings: use the Manage houses & rooms icon in Calendar, or Cancellation policy in Balances. Pricing management is still being built. These changes are local and have not been published.

“我的资料”显示当前 Google 登录账号的角色：管理员、员工和／或客户。角色不能在个人资料中修改，代客户查看时也不会变成对方的角色。如无法核实角色，请刷新重试。应用导航栏已移除“设置”；请在日历中点击“管理房屋与房间”图标，或在余额页点击“取消政策”。价格管理仍待实现。以上仅为本地更新，尚未发布。


## Pricing, pages and staff operations — local preview

Administrators can open **Pricing** to review the supplied rates and edit prices, packages or holiday dates in a dialog. A package uses its fixed USD price and boarding-day quantity; optional regular-band/weight comparison shows savings. These changes update displayed prices without changing past bookings or statements. Customers do not see price-editing controls. The public site now shows the supplied prices and no longer offers daycare.

Choose **Load more** at the bottom of a record list to append its next batch. Statement export includes all matching permitted entries, even when only one page is displayed. Pet/customer choices can load further results.

Assigned employees can use **House operations** to record arrival/pickup, verify weight during a stay, and correct actual handoff times. Planned times and original values remain in history. Their house assignment does not permit balance or price changes. To assign an existing employee, open Calendar → Manage houses & rooms → Employee house access, find their verified Google sign-in email, select houses and save. Clearing all houses removes their operational access. This does not create an employee account or role. Payment collection and boarding-day expiry are still unconfigured. All of this remains local and unpublished.

管理员可在“价格管理”中核对海报价格，并通过弹窗修改价格、寄养天数套餐及节假日。套餐使用固定美元价格与天数；可选择常规体重区间及比较体重，展示节省金额。修改不会重写历史预约或账单。客户无法编辑价格。公开网站现展示所提供的价格，不再提供日间托管。

在客户、宠物及余额列表底部点击“加载更多”，即可追加下一批记录。账单导出包含所有符合筛选条件且有权查看的记录，不仅是当前页。宠物与客户选项可继续加载。

已分配房屋的员工可在“房屋运营”中记录实际送达、接回，在照护期间核实体重，并更正交接时间；计划时间与原始数值保留在历史中。房屋权限不包含财务或价格管理权限，不会自动授权员工。管理员可在“日历 → 管理房屋与房间 → 员工房屋权限”中，通过已核实的 Google 登录邮箱查找已有员工，选择房屋并保存；取消全部选择会移除运营权限。本功能不会创建员工账号或授予员工角色。收款方式与寄养天数有效期仍待确认。以上为本地预览，尚未上线。

## Calendar, pet details and Spanish — local work, 2026-11-20

Both calendars use the same date controls. Scroll inside the calendar to keep its dates visible. The Add booking calendar shows unavailable ranges and your requested stay; unavailable rooms have no Choose button or requested-stay marker. Review lists normal days, holiday days and the separate holiday fee as an estimate; saving a staff plan still does not collect payment or spend balance days.

Click a pet's name or photo for its information, bookings, balance and activity. Customer-view pet rows match the administrator size. Customer calendars show other occupied rooms as Busy without revealing who booked them. Activity includes recorded bookings and cancellations, newest first.

Choose Español in the language menu. Price editing groups English, Simplified Chinese and Spanish names together. Custom saved prices keep their original names until you enter a Spanish translation.

两个日历现在使用相同的日期控件。在日历内向下滚动时，日期表头保持可见。添加预约日历中，不可用房间不显示“选择”按钮，也不显示“所需入住时段”。核对步骤按普通日期、节假日及额外节假日费用展示估算；保存员工计划仍不会收款或扣除余额。

点击宠物名称或照片，可查看资料、预约、余额和活动。客户视图中的宠物行与管理员视图大小一致。客户日历将其他客户的占用时段显示为“已占用”，不公开其身份。活动按最新优先显示预约、取消及余额变更。

在语言菜单中选择 Español，可使用西班牙语。编辑价格时可分别填写英文、简体中文及西班牙语名称。已有自定义价格在填写西班牙语译名之前保留原名称。

Selecciona Español en el menú de idioma. Haz clic en el nombre o la foto de una mascota para consultar sus datos, reservas, saldo y actividad. Los importes de la reserva son estimaciones; guardar un plan del personal no cobra tarjetas ni descuenta días.


## Price category names — language dropdown

In Add/Edit price, choose **Name language**, then enter that language's category name. Switch between English, 简体中文 and Español; your entries stay saved in the open form. The progress note shows which required names still need filling, and the preview shows what customers will see. Spanish remains optional for existing records; leaving it blank uses the existing label. Saving updates all entered names together.

新增／编辑价格时，先在“名称语言”中选择语言，再填写对应分类名称。切换英文、简体中文及西班牙语时，已输入内容会保留在当前表单中。进度提示说明仍需填写的必填语言，预览展示客户看到的名称。西班牙语维持选填；留空时使用已有名称。保存时会一起保存各语言名称。

## Category names and holiday dates — 2026-11-20

In Add/Edit price, choose a language, type its category name and press **Enter**. The name appears in the list below. Delete beside a name clears only that language; type a replacement and press Enter to add it again. Add pending names before saving. English and Simplified Chinese remain required; Spanish is optional.

In Holiday dates & surcharge, choose the year and check the named dates you want to apply the holiday fee to. Presets use actual US calendar holidays, not substitute office weekdays. Check the selected-date list before saving. Use **Add another date** for custom dates. Nothing is selected automatically.

新增／编辑价格时，选择语言，输入分类名称并按**回车**，名称会加入下方列表。点击名称旁的删除按钮仅清空该语言；输入新名称后按回车即可替换。请先添加正在输入的名称再保存。英文和简体中文仍为必填，西班牙语为选填。节假日设置中，选择年份并勾选需要加收费用的节日；列表显示美国节日实际日期，不含补休日期。可通过“添加其他日期”保留自定义设置。不会自动勾选节日。

## Access page — interactive local preview

Open http://localhost:4180/app/access/?lang=en and choose **Access** in the app bar. Accounts lets you search names/emails, filter roles/status, and edit example access. The dialog explains each role and shows the resulting permissions. Employee access includes house choices. Use Suspend access / Restore access with a reason. Invitations saves or cancels an invitation draft; Change history shows what you tried. The reset icon asks before clearing all preview changes. Your example owner account keeps administrator access.

This is a UI preview: accounts/houses are fictional, invitations are not sent and real permissions are unchanged. Changes reset when you leave or reload.

打开 http://localhost:4180/app/access/?lang=zh，点击“权限”。可搜索示例账号、按角色或状态筛选，在弹窗中编辑角色与员工房屋权限。停用或恢复需填写原因；“邀请”仅保存或取消草稿；“更改历史”展示预览操作。重置前会要求确认。示例店主的管理员权限受到保护。此处全部为虚构预览，不发送邀请，不改变真实权限，离开或刷新后会重置。

## Access is now connected locally — 2026-11-24

The Access page now reads and saves real records in the local demo database. Search for a signed-in Google account, choose Edit access, select roles/houses, enter the reason and save. Suspend access blocks workspace access immediately; Restore access keeps the previous role/house selections. Your own administrator access stays protected. Google-disabled accounts need help from the project administrator.

For a new person, choose Invite person, review their email and permissions, create the invitation, and copy the one-time code before closing. Share it privately; no email is sent automatically. The person signs in with that Google email, opens My profile → Accept invitation and pastes the code within 24 hours. Invitation access and customer-record linking remain separate. Cancel an unused invitation in Invitations. Change history saves the before/after details. If a save's result is unknown, keep the form open and Retry.

“权限”页面现已连接本地演示数据库，可保存账号角色和员工房屋分配。编辑时填写原因后保存；“停用权限”会立即阻止工作区访问，“恢复权限”保留原角色和房屋。您自己的管理员权限受到保护。新成员点击“邀请成员”，核对邮箱和权限后创建邀请码，并在关闭前复制，私下分享给对方。对方使用指定 Google 邮箱登录，在“我的资料 → 接受邀请”中粘贴，24 小时内有效。不会自动发送邮件，也不会自动关联已有客户资料。“邀请”可取消未使用的邀请码，“更改历史”保存前后内容。保存结果不明时请保留表单并重试。此功能尚未发布到正式网站。
