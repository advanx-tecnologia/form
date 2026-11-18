// Approved copy v6. Shared with backend tests; keys are stable, labels are not identifiers.
export const teams=['Comercial: encontrar, chamar e acompanhar clientes','Atendimento: responder na hora, até à noite','Conteúdo: posts e vídeos saindo sem você parar','Anúncios: mais gente certa te encontrando','Financeiro: cobrar, pagar e ver quanto sobrou','Gestão: painel e relatórios de como as coisas estão','Uma tarefa só (resumo do dia, orçamento, proposta ou contrato)','Ainda não sei, quero ajuda para descobrir'];
export const urgency=['Agora, o quanto antes','Nos próximos 30 dias','Nos próximos 3 meses','Só estou pesquisando por enquanto'];
export const revenue=['Ainda não faturo','Até R$ 10 mil','De R$ 10 mil a R$ 30 mil','De R$ 30 mil a R$ 100 mil','De R$ 100 mil a R$ 500 mil','Acima de R$ 500 mil'];
export const investment=['Sim, consigo','Não, agora não'];
export const opening='Oi! Aqui você conta o que mais pesa no seu dia a dia e já marca o seu diagnóstico gratuito. Leva pouco tempo.';
// First name with the first letter in upper case ("rafael" -> "Rafael").
export const firstName=n=>{const f=String(n||'').trim().split(/\s+/)[0];return f.charAt(0).toLocaleUpperCase('pt-BR')+f.slice(1);};
export const questions={
 name:{text:'Para começar, como você se chama?',placeholder:'Seu nome',autocomplete:'name'},
 phone:{text:a=>`Prazer, ${firstName(a.name)}! Qual é o seu WhatsApp? É por ele que a gente confirma o seu diagnóstico.`,placeholder:'(DDD) 9 0000-0000',type:'tel',autocomplete:'tel-national'},
 teams:{text:'Em qual parte você quer a ajuda dos agentes de IA? Pode marcar mais de uma.',options:teams,multi:true},
 pain:{text:'Sem problema! Com as suas palavras: o que mais toma o seu tempo ou faz você perder dinheiro hoje?',placeholder:'Ex.: passo a tarde respondendo as mesmas perguntas no WhatsApp',type:'textarea'},
 urgency:{text:'Quando você quer colocar isso para funcionar?',options:urgency},
 personal:{text:'Qual é o seu Instagram pessoal?',placeholder:'@seuperfil'},
 business:{text:'E o Instagram do seu trabalho (comercial)? Se for o mesmo, é só repetir.',placeholder:'@seutrabalho'},
 revenue:{text:'Quanto entra por mês, mais ou menos? Isso ajuda a gente a indicar o time certo para começar.',options:revenue},
 investment:{text:'Você consegue investir numa solução com garantia de funcionamento, com parcelas a partir de R$ 497 por mês?',options:investment},
 email:{text:'Por último, qual é o seu e-mail? Mandamos por lá o convite do diagnóstico.',placeholder:'voce@email.com',type:'email',autocomplete:'email'}
};
export function path(a){return ['name','phone','teams',...(a.teams?.includes(teams[7])?['pain']:[]),'urgency','personal','business','revenue',...(revenue.slice(0,2).includes(a.revenue)?['investment']:[]),...(a.investment===investment[1]&&revenue.slice(0,2).includes(a.revenue)?[]:['email'])];}
export function next(a){return path(a).find(k=>a[k]===undefined)??(a.investment===investment[1]&&revenue.slice(0,2).includes(a.revenue)?'end':'calendar');}
export function validate(k,v){const q=questions[k];if(!q)throw Error('Campo inválido.');if(q.multi){if(!Array.isArray(v)||!v.length||v.length>8||new Set(v).size!==v.length||v.some(x=>!q.options.includes(x)))throw Error('Escolha pelo menos uma opção.');return v;}
 if(typeof v!=='string')throw Error('Resposta inválida.');v=v.trim();if(!v||v.length>(k==='pain'?2000:200))throw Error('Confira sua resposta.');if(q.options&&!q.options.includes(v))throw Error('Escolha uma opção.');
 if(k==='phone'){v=v.replace(/\D/g,'').replace(/^55(?=\d{11}$)/,'');if(!/^[1-9]{2}9\d{8}$/.test(v))throw Error('Informe o WhatsApp com DDD.');}
 if(['personal','business'].includes(k)){v=v.replace(/^@/,'');if(!/^[A-Za-z0-9._]{1,30}$/.test(v))throw Error('Informe o @ do perfil.');v='@'+v;}
 if(k==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw Error('Confira seu e-mail.');return v;}
