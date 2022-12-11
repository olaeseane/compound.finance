const DAI_WHALE = '0x66c57bf505a85a74609d2c83e94aabb26d691e1f';
const DAI_ADDR = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const cDAI_ADDR = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643';
const LINK_WHALE = '0x0D4f1ff895D12c34994D6B65FaBBeEFDc1a9fb39';
const LINK_ADDR = '0x514910771AF9Ca656af840dff83E8264EcF986CA';
const cLINK_ADDR = '0xFAce851a4921ce59e912d19329929CE6da6EB0c7';
const COMPTROLLER_ADDR = '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B';
const UniswapAnchoredView_ADDR = '0x65c816077C29b557BEE980ae3cC2dCE80204A0C5';

const ERC20_ABI = [
  'function name() view returns(string)',
  'function symbol() view returns(string)',
  'function totalSupply() view returns(uint)',
  'function balanceOf(address) view returns(uint)',
  'function transfer(address to, uint amount) returns(bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const CTOKEN_ABI = [
  'function name() view returns(string)',
  'function symbol() view returns(string)',
  'function totalSupply() view returns(uint)',
  'function balanceOf(address) view returns(uint)',
  'function transfer(address to, uint amount) returns(bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function borrowBalanceCurrent(address account) returns (uint)',
];

module.exports = {
  DAI_WHALE,
  DAI_ADDR,
  cDAI_ADDR,
  LINK_WHALE,
  LINK_ADDR,
  cLINK_ADDR,
  COMPTROLLER_ADDR,
  UniswapAnchoredView_ADDR,
  CTOKEN_ABI,
  ERC20_ABI,
};
