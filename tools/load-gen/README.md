# Load Generation

This is deliberately not part of docker-compose.yaml to give the option of running the sample application without load. The image is available on Docker Hub but if you want to build your own, run:

```shell
$ ./build.sh <push>
```

Will build with image and optionally push it.

```shell
$ ./load-gen.sh
```

Runs the load generation script against the application started with `docker-compose up` . There are various command line options to configure the load.

Alternatively, you can run the Container from Docker Hub directly on one of the nodes having access to the web service:

```shell
$ docker run \
-d \
--rm \
--name="loadgen" \
--network=host \
-e "HOST=http://host:8080/"
-e "NUM_CLIENTS=5" \
-e "RUN_TIME=1h30m" \
-e "ERROR=1" \
-e "SILENT=1" \
robotshop/rs-load
```

Set the following environment variables to configure the load:

* HOST - The target for the load e.g. http://host:8080/
* NUM_CLIENTS - How many simultaneous load scripts to run, the bigger the number the bigger the load. The default is 1
* RUN_TIME - For NUM_CLIENTS greater than 1 the duration to run. If not set, load is run for ever with NUM_CLIENTS. See below.
* ERROR - Set this to 1 to have erroroneous calls made to the payment service.
* SILENT - Set this to 1 to surpress the very verbose output from the script. This is a good idea if you're going to run load for more than a few minutes.

## Kubernetes

Kubernetes deployment configuration is maintained in the [Sumstore-GitOps](https://github.com/sumanthbcloud/Sumstore-GitOps) repository. Any cluster deployment of this load generator should be defined there.

To get Kubernetes to automatically scale up/down the pods the load can be varied over time with:

```shell
$ ./load-gen.sh \
-h http://host:port/
-n 10 \
-t 1h30m
```

The load will be run with `10` clients for `1h30m` before dropping down to `1` client for `1h30m` then looping back to `10` clients etc.
