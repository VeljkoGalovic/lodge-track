#!/bin/bash
docker compose up -d
npx prisma db push
npm run dev