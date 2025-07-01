import type { File } from '@/schema';
import { render, Text, Box } from 'ink';
import { useState, useEffect } from 'react';

import { db } from '@/database';
import { files } from '@/schema';
import { platform } from 'node:os';
import { version } from '#package';
import { eq, and } from 'drizzle-orm';

type Value = string | number | boolean | Date;
type Commands = 'list' | 'clean' | 'info' | 'delete' | 'version';

interface CliProps {
  args: string[];
  command: Commands;
}

const ColoredValue = ({ value }: { value: Value }) => {
  const getColor = (val: Value) => {
    if (typeof val === 'boolean') return 'greenBright';
    if (typeof val === 'number') return 'yellowBright';
    if (typeof val === 'object') return 'redBright';
    return 'magenta';
  };

  const formatValue = (val: Value) => {
    return typeof val === 'string' ? `"${val}"` : String(val);
  };

  return <Text color={getColor(value)}>{formatValue(value)}</Text>;
};

const PrettyJson = ({ data }: { data: File[] }) => (
  <Box flexDirection="column" marginLeft={2}>
    <Text color="white">[</Text>
    {data.map((item, index) => (
      <Box key={item.id} flexDirection="column" marginLeft={2}>
        <Text color="whiteBright">{'{'}</Text>
        {Object.entries(item).map(([key, value]) => (
          <Box key={key} marginLeft={2}>
            <Text color="blueBright">"{key}"</Text>
            <Text color="white">: </Text>
            <ColoredValue value={value} />
            <Text color="white">,</Text>
          </Box>
        ))}
        <Text color="whiteBright">
          {'}'}
          {index < data.length - 1 ? ',' : ''}
        </Text>
      </Box>
    ))}
    <Text color="white">]</Text>
  </Box>
);

// Command aliases mapping
const commandAliases: Record<string, Commands> = {
  list: 'list',
  ls: 'list',
  l: 'list',
  show: 'list',
  all: 'list',

  info: 'info',
  i: 'info',
  'show-info': 'info',
  details: 'info',
  detail: 'info',
  get: 'info',

  delete: 'delete',
  del: 'delete',
  rm: 'delete',
  remove: 'delete',
  d: 'delete',

  clean: 'clean',
  cleanup: 'clean',
  clear: 'clean',
  c: 'clean',

  version: 'version',
  v: 'version',
  '--version': 'version',
  '-v': 'version',
  ver: 'version'
};

function Cli({ command, args }: CliProps) {
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [jsonData, setJsonData] = useState<File[] | null>(null);

  useEffect(() => {
    const handleList = async () => {
      const allFiles = await db.select().from(files);
      setJsonData(allFiles);
      setOutput(`Found ${allFiles.length} file(s)`);
    };

    const handleInfo = async (args: string[]) => {
      if (args.length < 1) {
        setError("invalid arguments for 'info'");
        return;
      }
      if (args.length > 1) {
        setError("too many arguments for 'info'");
        return;
      }

      const id = args[0];

      if (!id) {
        setError("missing required argument for 'info'");
        return;
      }

      const fileInfo = await db.select().from(files).where(eq(files.id, id));

      setJsonData(fileInfo);
      setOutput(fileInfo.length > 0 ? `File info for ID: ${id}` : `No files found with ID: ${id}`);
    };

    const handleDelete = async (args: string[]) => {
      if (args.length < 2) return setError("invalid arguments for 'delete'");
      if (args.length > 2) return setError("too many arguments for 'delete'");

      const id = args[0];
      const name = args[1];

      if (!id || !name) return setError("missing required arguments for 'delete'");

      try {
        await Bun.file(`files/${id}-${name}`).delete();
        await db.delete(files).where(and(eq(files.id, id), eq(files.name, name)));

        setOutput(`Successfully deleted ${id}:${name}`);
      } catch (err) {
        setError(`${id}:${name} may not exist\n${err instanceof Error ? err.message : String(err)}`);
      }
    };

    const handleClean = async (args: string[]) => {
      if (args.length < 2) return setError("invalid arguments for 'clean'");
      if (args.length > 2) return setError("too many arguments for 'clean'");

      const id = args[0];
      const name = args[1];

      if (!id || !name) return setError("missing required arguments for 'clean'");

      try {
        await db.delete(files).where(and(eq(files.id, id), eq(files.name, name)));
        setOutput(`Cleaned database entry for ${id}:${name}`);
      } catch (err) {
        setError(`${id}:${name} encountered an error\n${err instanceof Error ? err.message : String(err)}`);
      }
    };

    const runCommand = async () => {
      const commands = {
        list: () => handleList(),
        info: () => handleInfo(args),
        delete: () => handleDelete(args),
        clean: () => handleClean(args),
        version: () => {
          setOutput(`bun_uploader, version ${version} (${platform()})`);
        }
      };

      if (!(command in commands)) {
        const availableCommands = Object.keys(commandAliases).join(', ');
        return setError(`Unknown command '${command}'\nAvailable commands: ${availableCommands}`);
      }

      await commands[command]();
    };

    runCommand();
  }, [command, args]);

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="red" bold>
            Error:{' '}
          </Text>
          <Text color="redBright">{error}</Text>
        </Box>
      </Box>
    );
  }

  if (output) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="green" bold>
            {output}
          </Text>
        </Box>
        {jsonData && (
          <Box flexDirection="column">
            <PrettyJson data={jsonData} />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box padding={1}>
      <Text color="blue">Processing...</Text>
    </Box>
  );
}

const args = process.argv.slice(3);
const rawCommand = process.argv[2] ?? 'version';
const resolvedCommand = commandAliases[rawCommand] || rawCommand;

render(<Cli command={resolvedCommand as Commands} args={args} />);
