#!/bin/bash

LOG_PATH=/var/log/hookagent
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

echo "git fetch"
git fetch --all 

for br in $(git branch | sed 's/^[\* ]*//')
do
	if [[ $br == $branch ]]; then
		echo "found branch: $branch"
		found=1
	fi
done

if [[ $found == 1 ]]; then
	git clean  -d  -fx ""
	echo "git checkout -f -b $branch"
	git reset --hard origin/$branch
	git checkout -f -b $branch
	echo "git pull origin $branch"
	git pull origin $branch -f
else
	echo "git checkout origin/$branch -b $branch"
	git checkout origin/$branch -f -b $branch
fi

git submodule update --init --recursive

if [[ $task != '' ]]; then
	"$task"
	$task
fi

rm $TEMP_FLAG
