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

Codex will read the project instructions, make one complete change at a time, preview visible changes locally, and walk you through the result in the browser. It will test the change, open a GitHub pull request (a reviewable record of the change), merge it after validation, publish it, and check the live website. This workflow is already authorized; routine merges do not need another approval. Necessary account sign-in, business decisions, billing, or mandatory confirmations may still require your help.

Every release must keep English and Simplified Chinese working on phones and computers and preserve existing features. Hosting stays on Google Cloud: Firebase Hosting, Firebase Authentication, Firestore, and Cloud Run for the API.

The live website is https://niu-niu-family-paws.web.app. A local preview is for reviewing changes; ask for the live link when a change is delivered.

## Managing customer contacts

Open the website, choose **Sign in**, and use your authorized administrator Google account. In **Customers**, choose **Add customer**, enter the name, optional contact email/phone, and preferred language, then choose **Save customer**. Choose **Edit customer** beside a saved record to update it. Search using the beginning of the customer's name, contact email, or Google login email; clear the search box and search again to show all records. A Google login email is shown separately and cannot be changed by editing contact details.

中文界面：点击“登录”，使用已获授权的管理员 Google 账号。在“客户”中点击“添加客户”，填写姓名、可选的邮箱和电话及首选语言，再点击“保存客户”。点击记录旁的“编辑客户”可修改资料。搜索时输入姓名、联系邮箱或 Google 登录邮箱的开头；清空搜索框后再次搜索可显示所有记录。Google 登录邮箱单独显示，修改联系方式不会改变登录身份。

Adding a customer in the administrator directory saves contact information. It does not create their login, link a Google account, or send an email. Contact email is editable profile information, not verified login identity. Edits keep an audit history; customers and employees cannot open the administrator directory.

## Saving your own profile

Administrators first choose **My profile & pets** in **Workspace**. Choose **Customer management** to return to the directory. Both pages use the same Google login and existing profile/pet records. Switching pages keeps unsaved edits during the current session; reloading the website starts in customer management and discards unsaved edits. Saving still requires the usual Save buttons. Ordinary customers go straight to their own profile.

管理员先在“工作页面”中选择“我的资料与宠物”，即可管理自己的资料。点击“客户管理”返回客户目录。两页共用同一个 Google 账号和已有资料，不必重复注册。当前会话内切换页面会保留未保存的修改；刷新网站会回到客户管理，并放弃未保存的修改。修改仍需点击相应“保存”按钮才会保存。普通客户登录后直接进入自己的资料。

Customers sign in with their own Google account, enter **Your name** and **Your preferred language** under **My profile**, then choose **Save profile**. Later they can update these fields or reload their saved profile. Each Google identity accesses only its own profile. Administrators and staff also have a personal profile panel; it uses the same canonical record across their roles.

客户使用自己的 Google 账号登录，在“我的资料”中填写“您的姓名”和“您的首选语言”，再点击“保存我的资料”。以后可在这里修改或重新加载资料。每个 Google 账号只能访问自己的个人资料；管理员和员工也可填写自己的资料，不必另建账号。

The administrator directory shows these registered profiles automatically. Administrator edits and customer edits refer to the same record. Existing administrator-created records are not automatically linked by matching names/emails; the linking workflow is still a future feature. If another edit changes a record first, the app asks you to reload before saving again.

## Managing pets

After saving your profile, use **My pets → Add pet**, enter the pet's name and choose **Save pet**. Add as many separate pets as you need. Photos can be added later: choose **Edit pet**, select a JPEG, PNG or WebP image (up to 3 MB and 16 megapixels), and save. A newly selected image stays on your device until you save. Only the owner and authorized administrators can view saved photos. The system resizes photos and removes source metadata.

保存个人资料后，在“我的宠物”中点击“添加宠物”，填写名字后点击“保存宠物”。每只宠物单独添加。照片可以以后补：点击“编辑宠物”，选择 JPEG、PNG 或 WebP 图片（最大 3 MB、1600 万像素），再保存。新选的图片只有保存后才会上传。已保存的照片仅主人与获授权的管理员可查看，系统会缩小图片并移除原始元数据。

Administrators choose **Manage pets** beside a customer to see that customer's pets. **Search pet names** finds names by their beginning and shows the customer's name/Google email; **Manage these pets** opens all pets belonging to that customer. Edits update the same records the customer sees and keep an audit history. Use the existing customer search for customer names or Google emails. Adding pets does not link an unlinked contact to a Google account.

管理员在客户记录旁点击“管理宠物”，即可查看和编辑该客户的宠物。输入宠物名字的开头并点击“搜索宠物名字”，结果会显示宠物归属的客户；点击“管理这些宠物”可打开该客户的全部宠物。按客户姓名或 Google 邮箱查找时，仍使用“搜索客户”。管理员与客户修改同一份资料，修改会保留记录；添加宠物不会自动关联 Google 账号。

## Information still needed

The handoff tracks the latest status. Pending business information includes approved public contact details, service location and timezone, services and rates, package rules, official Chinese business name, photos, and branding. Sign-in email addresses are not automatically approved public contact information.

Service tracking also needs decisions about drop-off/pickup, when units are consumed, partial days, overnight stays, cancellations, expiry, and shared pet balances. Payment history, income reporting, care notes, and a separate attendance page are outside the current agreed scope.

## Continuing on another computer or account

Use the same GitHub project, `Fifiloveniuniu/niu-niu-family-paws`, and ask Codex to read its instructions. The saved guidance travels with the repository; it does not automatically grant access to GitHub, Google Cloud, or administrator accounts. A new environment may need the owner's authorized sign-in. Never paste passwords, private keys, or verification codes into project files.
