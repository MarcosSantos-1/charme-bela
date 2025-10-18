# Charme & Bela

A Charme & Bela, é um Espaço Estético que está em processo de crescimento. Atendemos diversos tipos e procedimentos porém não temos um sistema para acompanhar os clientes, agenda e tals, tendo que fazer tudo no papel e caneta (minha mãe, dona da clínica) o que torna o processo muito arcaico. Para solucionar, decidi criar esse sistema para gerar uma renda dinâmica e mensurável para minha mãe, focando a em vender assinaturas e não procedimentos em pacotes. Com isso, minha mãe consegue ter uma "renda" definida com base no número de clientes.

Uma observação é que eu sou do tipo que presa muito em ter o máximo de personalização possível, então é interessante que o admin possa mudar as coisas importantes como tempo máximo de cancelamento prévio, quantidade de tratamentos inclusos por plano por mês, configurações extras e etc.

---

## Modelo de Tratamentos avulsos

Nem tem muito o que falar, caso o cliente não queira assinar o Club, ele ainda conseguirá realizar os tratamentos de forma normal porém deve fazer o pagamento por pix ou cartao. Talvez uma dinâmica legal, será os agendamentos feitos pelo adm não requererem pagamentos na hora mas ficar em aberto a pendência podendo ser marcado como pago ou cancelado também pelo adm.

Todos os pagamentos são notificados para o admin, deve também ter a dinâmica de notificação do cliente

---

## Modelo de Assinatura "Charme & Bela Club"

A lógica é criar 3 níveis de planos, cada um com acesso a uma gama de tratamentos. O cliente paga um valor fixo mensal e tem direito a um número de procedimentos por semana ou por mês.

**Regra geral sugerida:** Para todos os planos, o assinante tem direito a realizar **de 4 a 6 procedimentos por mês**, limitado a **1 procedimento por semana ou** mais, se for o plano ouro. Isso organiza a agenda e garante que o cliente veja valor no plano ao longo de todo o mês.

### Plano 1: Essencial Beauty (bronze)

**Foco:** Cuidados faciais e corporais essenciais, ideais para manutenção e bem-estar. Perfeito para quem quer começar a se cuidar com mais frequência.

* **Preço Sugerido:** R$ 149,90 / mês

**Tratamentos Inclusos (o cliente escolxFaciais:** (poderia ser limitada a 1 por mês para não sobrecarregar a pele)

* * Limpeza de pele
  * Máscara de LED
  * Peeling de diamante
  * Peeling Ultrassonico
  * Revitalização Facial
* **Corporais:**
  * Pump (bumbum)
  * Carboxiterapia
  * Vacuoterapia
  * Manta Térmica
  * Vibrocel
* **Massagens:**
  * Drenagem Linfática
  * Massagem nos Pés

**Vantagem do Plano:** Oferece uma ótima economia. Por exemplo, uma única Limpeza de Pele (R$100-130) e uma Drenagem (R$80) já quase pagam o plano. É um grande atrativo para novos clientes.

---

### Plano 2: Plus Care (prata)

**Foco:** Clientes que buscam tratamentos um pouco mais elaborados ou tecnológicos, incluindo modelagem corporal e cuidados faciais mais avançados.

* **Preço Sugerido:** R$ 249,90 / mês

**Tratamentos Inclusos (o cliente escolhe 1 por semana):**

* **Todos os tratamentos do Plano Essencial Beauty**, e mais:
* **Faciais:**
  * Radiofrequência Facial
  * Jato de Plasma
  * Tratamento p/ acne
* **Corporais:**
  * Radiofrequência Corporal
  * Heccus
  * Seca Barriga
  * Depilação a cera (áreas a definir, ex: 1 área grande ou 2 pequenas por sessão)
  * Tratamento p/ celulite
  * Tratamento p/ gordura Localizada
* **Massagens:**
  * Massagem Modeladora
  * Massagem Relaxante com pedras quentes
  * Massagem Relaxante com bambuterapia
  * Massagem Relaxante com ventosaterapia

**Vantagem do Plano:** Acesso a tecnologias como Radiofrequência e Heccus, que têm um custo individual mais elevado. A economia para o cliente aqui é ainda maior, incentivando o upgrade.

---

### Plano 3: Premium Experience (ouro)

**Foco:** Acesso total e exclusivo. Ideal para clientes que desejam os tratamentos mais avançados e de alto impacto, como microagulhamento e peelings mais intensos, com máxima flexibilidade.

* **Preço Sugerido:** R$ 399,90 / mês

**Tratamentos Inclusos (o cliente escolhe até 6 tratamentos por mês):**

* **Todos os tratamentos dos Planos Essencial e Plus**, e mais:
* **Faciais:**
  * Microagulhamento (limitar a 1 por mês, devido ao tempo de recuperação da pele)
  * Peeling de Algas
  * Peeling Químico (com a mesma limitação de 1 por mês)
  * Skinbooster
  * Tratamento p/ melasma
* **Corporais:**
  * Hidrolipoclasia
  * Tratamento p/ estria
  * Enzima
  * Lipo sem corte
* **Massagens:**
  * Massagem Pós operatório
  * Mix de massagens (combinação de técnicas)

**Vantagem do Plano:** Acesso a procedimentos de alto valor agregado. Apenas um Microagulhamento (R$180) e um Skinbooster (R$250) no mês, feitos de forma avulsa, custariam mais caro que a mensalidade, o que torna o plano extremamente vantajoso.

---

### Tratamentos que Ficam de Fora (ou com regras especiais)

* **Depilação a Laser:** O valor varia muito (R$40 a R$230). A máquina de depilação é alugado uma ou duas vezes por mês. portanto será necessário adicionar uma dinâmica no futuro para as clientes marcarem a depilação no dia em que for alocado
* **Acompanhamento (Nutricionista / Dermatologista):** Por serem serviços de outros profissionais e com custo elevado, devem ficar de fora.

---

## Sobre Agendamentos

Essa será uma parte desafiadora pois não pode acontecer por exemplo de dois clientes agendarem o mesmo horário. Os agendamentos são muito importante. Como já dito, quando o cliente faz o cadastro e primeiro acesso, exiba todos os serviços de forma normal com a dinâmica de mostrar primeiro os serviços que o plano contempla (se for por assinatura), quando ele for fazer um agendamento, deve redirecionar para a sessão de formulário de anamnese e salvar os dados conforme já tem o frontend. Após a ficha preenchida, o usuário poderá agendar os tratamentos normalmente.

A principio, o cliente pode agendar somente por horário (15h, 16h,17h... no frontend está separado por horários, porém tem que definir essa dinâmica no painel do admin pois ele quem define os horários da semana) futuramente pretendo tornar melhor a dinâmica para maximizar tratamentos curtos. o admin pode antecipar o atrasar uma consulta também.

Tem uma regra que na pagina admin que conforme o input do horário, o cliente não pode reagendar. No caso eu vou deixar 8h mas pode ser ajustável. Se eu marcar uma consulta para amanhã, as 09h da manhã, eu não posso reagendar as 6h da manhã, se eu como cliente for cancelar nesse período, perco um dos 4 ou 6 tratamentos do mês!

Outra coisa importante. Caso o admin cancele o dia ou horário, o cliente que tiver seu horário perdido deve ser alertado na mensagem e uma forma de alerta-los. Por isso será muito importante ter todos os feriados já marcados no calendário e o papel do admin vizualizando e marcando certinho os clientes e tals.

# Fluxos da Aplicação

1. **Do cliente novo à finalização da consulta.**
   - Realiza o cadastro via email/ senha ou google
   - Começa o perfil sem assinatura
   - Escolhe um tratamento para fazer
   - pode Escolher avulso ou assinar um plano
   - se escolher assinar o plano, ele é redireciodo para a tela de planos onde assinar pelo stripe
   - se escolher o avulso, ao clicar em "Agendar" é redirecionada antes para a tela de formulário das fichas de anamaneses (as 5 etapas).
   - após preencher o formulário e concordar com os termos, o cliente poderá fazer o agendamento onde escolhe um dia e horário disponível e exibe também os indisponíveis.
   - o cliente que fizer uma assinatura, após a assinatura for validada, o status do plano e conta do cliente vai mudar, e os tratamentos que cobrirem o plano do cliente irão aparecer disponíveis assim como a quantidade. o cliente poderá agendar os horários disponíveis
   - Após o agendamento, o cliente poderá verificar na tela inicial e outros lugares.
   - Conforme confirmado pelo admin, após o horário da consulta,automáticamente será marcado como finalizado a não ser que o admin cancele.
   - Se não for confirmado pelo admin, o status será pendente
   - O cliente poderá reagendar a consulta para qualquer outro dia e horário disponível, desde que ele respeite o horário de antescedência que será estipulado (eu prefiro 8 horas por enquanto mas sujeito a alteração)
   - Após finalizado a consulta, irá para o histórico do cliente e dados do portal do admin
   - Tenho que adicionar uma dinâmica de fidelidade, incialmente de 3 meses para nao prejudicar minha mae, nao sei se dar para fazer pelo stripe
2. **Acesso do administrador.**
   - Todo dia, minha mãe irá acessar logo cedo a plataforma para ver os clientes disponíveis e horários, onde ela poderá confirmar, reagendar ou cancelar
   - No início da semana ou no decorrer dela, minha mãe vai gerenciar os horários, pois tem dias que ela faz hora extra e tals, caso uma cliente solicite, ela poderá agendar fora do horário de funcionamento também.
   - No quadro de agendamentos, minha mãe terá acesso a uma visão ampla de todos os agendamentos feitos até então pelos clientes, podendo gerenciar melhor o tempo
   - na página de admin, basicamente minha mãe poderá fazer a ficha de anamnese, alterar algumas informações da página e aplicativo, adicionar as fotos de promoções que irão aparecer na tela inicial e no landing page além de outras configurações.
   - Na tela de clientes, minha mãe poderá dar vaucher (como um mês de assinatura para qualquer plano que quiser ou tratamento gratuito (o cliente poderá escolher sem ter fazer o checkout podendo também reagendar)) e etc. Essa parte será desafiadora e trabalhosa tendo que ter bastante atenção para nao ter cagadas e erros, também deve haver alertas personalizados como "vc ganhou um presente"
   - Minha mãe também poderá criar um cliente com nome completo, email e senha (se tiver) com alguns detalhes e ficha de anamanese (isso será para clientes que nao tem celular ou nao querem um acompanhamento pelo app, geralmente idosos ou amigos que nao se preocupam com isso, o cadastro será mais para a minha mãe saber que tem cliente no dia e etc)

# Para a IA

Pode editar ou modificar conforme queira ou ache melhor

Tente achar lacunas ou brechas que possa prejudicar o sistema, regra de negócio ou minha mae diretamente.

Para não te sobrecarregar de informação ou codificação, faça pausas apenas informando o que deve ser continuado, assim vc evita sobrecargas e excessos de gastos com tokens desnecessarios além de eu saber o que vc tá fazendo e pode ajudar ou gerenciar.

Não comece o sistema de pagamentos agora, quando for fazer, eu te aviso, se alguma coisa depende mesmo que parcialmente dos sistemas de pagamentos, tenta criar um mock ou algo só para teste e depois quando eu pedir vc remova
