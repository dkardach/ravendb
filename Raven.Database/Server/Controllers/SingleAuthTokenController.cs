﻿using System;
using System.Net.Http;
using System.Web.Http;
using Raven.Database.Server.Security;

namespace Raven.Database.Server.Controllers
{
    public class DbSingleAuthTokenController : RavenDbApiController
    {
        [HttpGet]
        [Route("singleAuthToken")]
        [Route("databases/{databaseName}/singleAuthToken")]
        public HttpResponseMessage SingleAuthGet()
        {
            var authorizer = (MixedModeRequestAuthorizer) ControllerContext.Configuration.Properties[typeof (MixedModeRequestAuthorizer)];

            var token = authorizer.GenerateSingleUseAuthToken(DatabaseName, User);

            return GetMessageWithObject(new
            {
                Token = token
            });
        }
    }
}

namespace Raven.Database.Server.RavenFS.Controllers
{

    public class FsSingleAuthTokenController : RavenFsApiController
    {
        [HttpGet]
        [Route("fs/{fileSystemName}/singleAuthToken")]
        public HttpResponseMessage SingleAuthGet()
        {
            var authorizer = (MixedModeRequestAuthorizer) ControllerContext.Configuration.Properties[typeof (MixedModeRequestAuthorizer)];

            var token = authorizer.GenerateSingleUseAuthToken(FileSystemName, User);

            return GetMessageWithObject(new
            {
                Token = token
            });
        }
    }
}

namespace Raven.Database.Counters.Controllers
{
    public class CounterSingleAuthTokenController : RavenCountersApiController
    {
        [HttpGet]
        [Route("counters/{counterName}/singleAuthToken")]
        public HttpResponseMessage SingleAuthGet()
        {
            var authorizer = (MixedModeRequestAuthorizer) ControllerContext.Configuration.Properties[typeof (MixedModeRequestAuthorizer)];

            var token = authorizer.GenerateSingleUseAuthToken(CountersName, User);

            return GetMessageWithObject(new
            {
                Token = token
            });
        }
    }
}
