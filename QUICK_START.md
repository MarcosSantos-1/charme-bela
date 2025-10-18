# ⚡ QUICK START - Charme & Bela

## 🚀 Iniciar Projeto (2 terminais)

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```
✅ Servidor rodando em `http://localhost:3333`

### Terminal 2 - Frontend:
```bash
cd charme-bela/web
npm run dev
```
✅ Frontend rodando em `http://localhost:3000`

---

## 🧪 TESTAR LOGIN

### Usuários de Teste:
1. **maria@teste.com** / senha: `20314139`
2. **edinalva@teste.com** / senha: `20314139`

### Admin:
- **sonia.santana** / senha: `2020`

---

## 📚 DOCUMENTAÇÃO

- **INTEGRATION_COMPLETE.md** - Guia completo de integração
- **USAGE_EXAMPLES.md** (frontend) - Exemplos de código prontos

---

## 🔑 ROTAS PRINCIPAIS

### Buscar usuário após login:
```
GET /users/firebase/{firebaseUid}
```

### Listar serviços:
```
GET /services
```

### Listar planos:
```
GET /plans
```

### Horários disponíveis:
```
GET /schedule/available?date=2025-10-21
```

### Criar agendamento:
```
POST /appointments
{
  "userId": "user_id",
  "serviceId": "service_id",
  "startTime": "2025-10-21T14:00:00.000Z",
  "origin": "SUBSCRIPTION"
}
```

---

## ✅ STATUS DO PROJETO

✅ Backend 100% funcional  
✅ Frontend pronto para integrar  
✅ Usuários de teste configurados  
✅ Firebase UIDs atualizados  
✅ Hooks criados  
✅ Adapters criados  
✅ Types sincronizados  

---

## 🎯 IMPLEMENTAR AGORA

1. **Login** - Já funciona! Testa com maria@teste.com
2. **Serviços** - `const services = await api.getServices()`
3. **Planos** - `const plans = await api.getPlans()`
4. **Agendamento** - Use `useAppointments` hook

**Comece pelas páginas simples e vá evoluindo!**

---

## 🐛 PROBLEMAS COMUNS

### "Cannot find module '@/lib/api'"
**Solução:** Certifique-se que está no diretório `charme-bela/web`

### "CORS Error"
**Solução:** Backend já configurado, mas verifique se `FRONTEND_URL` está correto no `.env`

### "Usuário não encontrado"
**Solução:** Use `getOrCreateUserFromFirebase()` - cria automaticamente

---

## 📞 AJUDA

Qualquer dúvida, veja os exemplos em `charme-bela/web/USAGE_EXAMPLES.md`

**BOA SORTE! 🎉**

