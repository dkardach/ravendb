﻿using Raven.Abstractions.Data;
using Raven.Client.Util;
using Raven.Json.Linq;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Raven.Client.FileSystem.Impl
{
    internal class UploadFileOperation : IFilesOperation
    {
        protected readonly InMemoryFilesSessionOperations sessionOperations;

        public string Path { get; private set; }
        public RavenJObject Metadata { get; private set; }
        public Etag Etag { get; private set; }

        
        public long Size { get; private set; }
        public Action<Stream> StreamWriter { get; private set; }


        public UploadFileOperation(InMemoryFilesSessionOperations sessionOperations, string path, long size, Action<Stream> stream, RavenJObject metadata = null, Etag etag = null)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentNullException("path", "The path cannot be null, empty or whitespace.");

            this.sessionOperations = sessionOperations;

            this.Path = path;
            this.Metadata = metadata;
            this.Etag = etag;

            this.StreamWriter = stream;
            this.Size = size;
        }

        public async Task Execute(IAsyncFilesSession session)
        {
            var commands = session.Commands;

            var pipe = new BlockingStream(10);           

            var task = Task.Run(() => StreamWriter(pipe))
                           .ContinueWith(x => { pipe.CompleteWriting(); })
                           .ConfigureAwait(false);

            await commands.UploadAsync(Path, pipe, Metadata, Size, null)
                          .ConfigureAwait(false);
        }
    }
}