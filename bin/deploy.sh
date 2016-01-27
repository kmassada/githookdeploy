#!/bin/bash

LOG_PATH=/var/log/githookdeploy
PROJECT=$1

branch=$2
task=$3

TEMP_FLAG=$LOG_PATH/.$PROJECT.$branch

if [[ ! -f $TEMP_FLAG ]]; then
	touch $TEMP_FLAG
else
	exit 0
fi

found=0

echo "git fetch --all"
git fetch --all

for br in $(git branch | sed 's/^[\* ]*//')
do
	if [[ $br == $branch ]]; then
		echo "found branch: $branch"
		found=1
	fi
done

if [[ $found == 1 ]]; then
  echo "git clean  -d  -fx "
	git clean  -d  -fx ""
	echo "git reset --hard origin/$branch"
	git reset --hard origin/$branch
  echo "git checkout -f -b $branch"
	git pull origin $branch -f
else
	echo "git checkout origin/$branch -f -b $branch"
	git checkout origin/$branch -f -b $branch
fi

git submodule update --init --recursive

if [[ $task != '' ]]; then
	"$task"
	$task
fi

rm $TEMP_FLAG
