# Cloud Services & Infrastructure - Session 2 - Backend and Database

Goal: Build the backend API and connect it to a database.
Topics & Hands-on:

1. Setting up Bun (Node.js alternative) backend with Elysia (Express alternative)
2. Connecting to MySQL with Sequelize
3. Writing a simple REST API with CRUD operations
4. Dockerizing the backend & database

**Project Task:** Teams set up their initial repo and infrastructure. Teams start to implement their backend and database.

## 1. Setting up Bunjs backend with Elysia

For the project, you can use whatever backend you want. In this session, we will use Bun with Elysia (similar to Express.js), as Bun is getting quite nicely attraction and it is an almost drop-in replacent for Node.js. Other good alternatives could be for example [Node.js](https://nodejs.org) or [Deno](https://deno.land/).

First, go an install Bun: https://bun.sh/

Let's start by creating a new backend project folder in the root of your project. We will be using TypeScript, but thankfully Bun supports TypeScript out of the box. So no need to install anything extra there!

The Bun service will be named as **backend** and this will be the folder where we will be working on the backend during the entire course. So, run the following commands in the project root (in this example this is considered to be the session_2/):

```bash
bun create elysia backend
cd backend
```

This will create all the required configurations to run bun in the project. You can now run the following command to start the server:

```bash
bun run index.ts
```

You should be able to get the "Hello via Bun!"

Next, lets add the Elysia to our project. This is a new framework for building APIs in Bun. It is a bit like Express, but with a lot of new features and a lot of improvements.

```bash
bun add express
```
