# Estágio 1: Build/Dependências
# Usamos a imagem Alpine por ser extremamente leve e segura
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas os arquivos de definição de pacotes primeiro
# Isso otimiza o cache do Docker; o 'npm install' só roda se esses arquivos mudarem
COPY app/package*.json ./

# Instala as dependências de produção
RUN npm install --omit=dev

# Copia o restante do código da aplicação
COPY app/ ./

# Expõe a porta que a aplicação utiliza
EXPOSE 3000

# Variáveis de ambiente básicas para produção
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar a aplicação
# Usamos 'node src/server.js' diretamente para garantir que os sinais de encerramento (SIGTERM) 
# sejam recebidos corretamente pelo processo Node, facilitando o gerenciamento do container.
CMD ["node", "src/server.js"]
