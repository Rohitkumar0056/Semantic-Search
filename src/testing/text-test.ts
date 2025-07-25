import axios from 'axios';

type FilterCondition = {
  gt?: number | string;
  lt?: number | string;
  eq?: number | string;
  gte?: number | string;
  lte?: number | string;
  ne?: number | string;
  in?: number[] | string[];
  nin?: number[] | string[];
};

type Filters = Record<string, FilterCondition>;

async function hybridVector(
  query_text: string,
  bot_id: string,
  limit: number,
  number_of_queries?: number,
  filters: Filters = {}
): Promise<void> {
  const queryParams: string[] = [];

  queryParams.push(`query_text=${encodeURIComponent(query_text)}`);
  queryParams.push(`bot_id=${encodeURIComponent(bot_id)}`);
  queryParams.push(`limit=${encodeURIComponent(limit.toString())}`);
  queryParams.push(`user_id=test-user`);

  if (number_of_queries !== undefined) {
    queryParams.push(`number_of_queries=${encodeURIComponent(number_of_queries.toString())}`);
  }

  if (Object.keys(filters).length > 0) {
    const encodedFilters = encodeURIComponent(JSON.stringify(filters));
    queryParams.push(`filters=${encodedFilters}`);
  }

  const url = `http://localhost:3001/search/text?${queryParams.join("&")}`;

  try {
    const response = await axios.get(url);
    console.log('Results:', response.data);
    console.log('Request URL:', url);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.error('Error:', err.response?.data ?? err.message);
    } else {
      console.error('Unexpected error:', err);
    }
  }
}

hybridVector(
  'What is Jio 5G Wi-Fi service?',
  '67dc34bc1ed83fcdce58ccdc-BOT-001',
  2,
  3,
  //{ tags: { eq: '5g' } }
);
