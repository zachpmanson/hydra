#!/usr/bin/env bash

set -e
function deploy() {
  echo Compiling...
  env GOOS=linux GOARCH=amd64 go build -o hydra-linux-amd64
  echo Compiled!

  echo Copying files...
  rsync -azvR ./hydra-linux-amd64 ./static/* ./html/* root@hydra.zachmanson.com:/root/hydra/
  # scp hydra-linux-amd64 root@hydra.zachmanson.com:/root/hydra/
  # scp html/* root@hydra.zachmanson.com:/root/hydra/html
  # scp static/* root@hydra.zachmanson.com:/root/hydra/static
  echo Copied!

  echo Restarting server...
  ssh root@hydra.zachmanson.com systemctl restart hydra
  echo Deployment complete!
}

time deploy