import os
import urllib.request

images = {
    "hero_mountains.jpg": "https://lh3.googleusercontent.com/aida-public/AB6AXuCI3GqJ7qf5daZnQwoSBr8Olvxtmqq1p3faU5UlF5tRXYepNg4mfpzQiL0XlpWoQdnnYdkhzEqMWQX4DVQnW4S07Yxg6weq3qf7hH5c8NyCOfBk0ThdIktWZ7u-6aFSbtxDqius7fFPSCJ1UsZow1gbu08CwptKu8nNkp1I6BCTLGzD4EGrjTElfA1HHhhbf1w53XYi49fW_sPM_ydKkJ-BjfCInkwHR4PiEZVcft-F8cTMxgYYf8k",
    "discover_village.jpg": "https://lh3.googleusercontent.com/aida-public/AB6AXuAi8_rX4b2iBBsDb5O4JCaWHL0APrYfzkoRmh55-obJBVNgzKcOmDGde7lFwol8v8v2LkEzZtZfw8g9zxOiuYv1NypZPTB6ks4UHCiDhdYDqjsx3ZX5oCETnjcfy2gqri1OCGS-SAxwrDsHwZNyOOEd9uQ5pDMAQrifuXAc2upe3PaLuiGzdW-7JETUArdg6SSLFjpzO0kOjKw2Jy8_YFeGr1N6abrQS6CoCr843TuxuwPw56nJbYk",
    "plan_flatlay.jpg": "https://lh3.googleusercontent.com/aida-public/AB6AXuBDpIXKy_4EENskhXhxOFgwpzFQeRlPB2gJUiN5JulNyIHkzsT-eRYCg5vgkuPwSyMyemrqrEQgnQ89ACLp1GE6k1SHMiC162PBlGoTqkLYNOsz9tZ23-v82MXzCVqtjGqUZySEbS2_u5TOG0v3I2JqJUQxzeCiArPHgq7vV94mTW1VH9C9bRiGEososahF4H4pRckLfudVBa_os0ckV3JyynjRTB3cXW6DasDcSMWfDc6wX2iiMEA",
    "plan_mobile.jpg": "https://lh3.googleusercontent.com/aida-public/AB6AXuC50LN3FL9tZmvtFv1jv4c025TQZVyy29ICKci6joMXgBsq41xnXVmFsOIsrfZoaoOg_pOxnQmey3TxwP1POqCM2EqgjU9EJDxofcEVFGQ8L6gdwP1JZbvirSuSiG0KV6QbDTHpocpzTUuSvgzpR439DS7GzTpYR3Vp45nEGVGFAE2o_FJYvj4_TZEBTuJR8-1Sn9CdsLiwQhhQpYh9VY8yloB5KQQ1UwS_hSNKKdBTs4YGxlHUdSM",
    "panoramic_lake.jpg": "https://lh3.googleusercontent.com/aida-public/AB6AXuDb_UqXTm3QCW32mCpIuKpBKdf-6sjVOmnAHdRTNg7AzjOFGuCvopHku_HDxS1YInOosmOa1TXYZMS6dpw_w2rdV6U1LjLsbTnYwijCilCvi87782to6oUuXpPXueqKNftr7ED-fwnG_9yDJDbV55g5ZKzzEbJwSyQsHldJGHI5ogpwc9KVqp_Qk-IOCavHyViqqUXfILx_-F79Rpc_aYCh0ovv31kBtZdj3aTUIGRCLGp45h2KaV0",
}

target_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "public", "images", "stitch")
os.makedirs(target_dir, exist_ok=True)

for name, url in images.items():
    dest = os.path.join(target_dir, name)
    try:
        print(f"Downloading {name}...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response, open(dest, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Saved {name} ({os.path.getsize(dest)} bytes)")
    except Exception as e:
        print(f"Failed to download {name}: {e}")

print("All Stitch images downloaded successfully!")
