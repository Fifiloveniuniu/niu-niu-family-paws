import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/staging',workers:1,use:{baseURL:'http://127.0.0.1:4178',channel:'chrome'},
 webServer:{command:'npm run dev -- --mode staging --port 4178 --strictPort',url:'http://127.0.0.1:4178',reuseExistingServer:false},
});
