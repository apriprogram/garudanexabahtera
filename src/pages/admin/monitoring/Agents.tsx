import { useState, useEffect } from 'react';
import { 
  Bot, Plus
} from 'lucide-react';
import { monitorAPI, formatNumber, formatDate } from '../../../lib/monitor-api';

const Agents = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', provider: 'ollama', model: '' });

  const fetchAgents = async () => {
    try {
      const res = await monitorAPI('get_monitor_agents');
      setAgents(res.data || res || []);
    } catch (err) { console.error(err); }

  };

  const fetchDetail = async (id: number) => {
    try {
      const res = await monitorAPI('get_monitor_agent_detail', { id });
      setDetail(res);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAgents(); const i = setInterval(fetchAgents, 30000); return () => clearInterval(i); }, []);

  const addAgent = async () => {
    await monitorAPI('add_monitor_agent', form, 'POST');
    setShowAdd(false); setForm({ name: '', provider: 'ollama', model: '' }); fetchAgents();
  };

  const deleteAgent = async (id: number) => {
    await monitorAPI('delete_monitor_agent', { id }, 'POST');
    if (detail?.id === id) setDetail(null);
    fetchAgents();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Bot className="text-primary" /> AI Agents
        </h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all">
          <Plus size={16} /> Add Agent
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">Add AI Agent</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input placeholder="Agent Name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary" />
            <select value={form.provider} onChange={e => setForm(p => ({...p, provider: e.target.value}))}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary">
              <option value="ollama">Ollama</option>
              <option value="openai">OpenAI</option>
              <option value="hermes">Hermes</option>
              <option value="custom">Custom</option>
            </select>
            <input placeholder="Model (e.g. qwen2.5:14b)" value={form.model} onChange={e => setForm(p => ({...p, model: e.target.value}))}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary" />
            <div className="flex gap-2">
              <button onClick={addAgent} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium">Save</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">{detail.name}</h3>
              <p className="text-sm text-slate-500">{detail.provider} · {detail.model}</p>
            </div>
            <button onClick={() => setDetail(null)} className="text-sm text-slate-500 hover:text-white">Close</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500">Total Tokens</p>
              <p className="text-lg font-bold mt-1 text-white">{formatNumber(detail.total_tokens)}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500">Total Cost</p>
              <p className="text-lg font-bold mt-1 text-emerald-400">${detail.total_cost?.toFixed(4) || '0'}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500">Avg Response</p>
              <p className="text-lg font-bold mt-1 text-white">{detail.avg_response_time ? `${detail.avg_response_time}ms` : '-'}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500">Error Rate</p>
              <p className="text-lg font-bold mt-1 text-amber-400">{detail.error_rate || '0'}%</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 mb-3">Usage History</div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {detail.logs?.map((log: any) => (
              <div key={log.id} className="flex items-center gap-4 p-2 bg-slate-800/30 rounded-lg text-xs">
                <span className="text-slate-500 w-32">{formatDate(log.created_at)}</span>
                <span className={`px-2 py-0.5 rounded-full ${
                  log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>{log.status}</span>
                <span className="text-slate-400">{formatNumber(log.total_tokens)} tokens</span>
                <span className="text-slate-500">${log.cost_estimate?.toFixed(4)}</span>
                <span className="text-slate-500">{log.response_time_ms}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((a: any) => (
          <div key={a.id} className="bg-slate-900/30 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl">
                  <Bot size={20} />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">{a.name}</h4>
                  <p className="text-xs text-slate-500">{a.provider} · {a.model}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/30 rounded-xl">
                <p className="text-[10px] text-slate-500">Tokens</p>
                <p className="text-sm font-semibold text-white mt-1">{formatNumber(a.total_tokens)}</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-xl">
                <p className="text-[10px] text-slate-500">Cost</p>
                <p className="text-sm font-semibold text-emerald-400 mt-1">${a.total_cost?.toFixed(2) || '0'}</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-xl">
                <p className="text-[10px] text-slate-500">Requests</p>
                <p className="text-sm font-semibold text-white mt-1">{formatNumber(a.total_requests)}</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-xl">
                <p className="text-[10px] text-slate-500">Errors</p>
                <p className={`text-sm font-semibold mt-1 ${a.error_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {a.error_count || 0}
                </p>
              </div>
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-slate-800">
              <button onClick={() => fetchDetail(a.id)} className="text-xs text-primary hover:underline">Details</button>
              <button onClick={() => deleteAgent(a.id)} className="text-xs text-rose-500 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Agents;
