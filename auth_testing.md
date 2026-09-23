# Auth Testing Playbook
1. Login: curl -X POST $API/api/auth/login -H 'Content-Type: application/json' -d '{"identifier":"baa","password":"Nai130994"}' → returns {token,user}
2. Me: curl $API/api/auth/me -H "Authorization: Bearer <token>"
3. PIN: curl -X POST $API/api/auth/verify-pin -H "Authorization: Bearer <token>" -d '{"pin":"130994"}'
4. Wrong password 5x → 15 min lockout (login_attempts collection).
5. mongosh: db.users.find({}, {username:1, role:1, password_hash:1}) — hashes start with $2b$.
