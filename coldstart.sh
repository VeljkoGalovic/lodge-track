#!/bin/bash
docker start lodge-postgres
npx prisma db push
npm run dev
